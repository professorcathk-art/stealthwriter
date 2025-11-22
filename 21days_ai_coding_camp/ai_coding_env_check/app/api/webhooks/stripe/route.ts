import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2022-11-15',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
]);

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  if (!webhookSecret || !sig) {
    console.error('Missing Stripe webhook secret or signature');
    return NextResponse.json({ error: 'Signature required' }, { status: 400 });
  }

  const body = await request.arrayBuffer();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(Buffer.from(body), sig, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!SUPPORTED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabaseAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id;
        if (!orderId) break;

        await supabase
          .from('orders')
          .update({
            status: 'paid',
            stripe_session_id: session.id,
            stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
            stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
          })
          .eq('id', orderId);

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(supabase, subscription);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription && typeof invoice.subscription === 'string') {
          const subscription = await fetchSubscription(invoice.subscription);
          if (subscription) {
            await upsertSubscription(supabase, subscription);
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Webhook processing error', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  subscription: Stripe.Subscription
) {
  const plan = subscription.items.data[0]?.price?.recurring?.interval ?? 'monthly';
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  const payload = {
    user_id: undefined as string | undefined,
    plan_id: 'pro',
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelled_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string | null,
    billing_cycle: plan === 'year' ? 'yearly' : 'monthly',
  };

  if (!payload.user_id && typeof subscription.customer === 'string') {
    const { data: orders } = await supabase
      .from('orders')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer)
      .limit(1)
      .maybeSingle();
    payload.user_id = orders?.user_id ?? undefined;
  }

  if (!payload.user_id) {
    console.warn('Subscription has no user_id yet', subscription.id);
  }

  if (existing?.id) {
    await supabase.from('subscriptions').update(payload).eq('id', existing.id);
  } else {
    await supabase
      .from('subscriptions')
      .insert({ ...payload, stripe_subscription_id: subscription.id })
      .select('id');
  }
}

async function fetchSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice.payment_intent'],
  });
}

