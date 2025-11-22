import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  getSupabaseAdminClient,
  getSupabaseAuthClient,
} from '@/lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2022-11-15',
});

type BillingCycle = 'monthly' | 'yearly';

type OrderPayload = {
  cycle: BillingCycle;
};

const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://stealthwriter-amber.vercel.app';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: '請先登入才能建立訂單。' },
        { status: 401 }
      );
    }

    const supabaseAuth = getSupabaseAuthClient(accessToken);
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: '登入資訊失效，請重新登入。' },
        { status: 401 }
      );
    }

    const payload = (await request.json().catch(() => ({}))) as OrderPayload;
    const cycle: BillingCycle = payload.cycle === 'yearly' ? 'yearly' : 'monthly';
    const amount = cycle === 'yearly' ? 5900 : 799;

    const supabase = getSupabaseAdminClient();
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: userData.user.id,
        plan: 'pro',
        cycle,
        status: 'pending',
      })
      .select('id')
      .maybeSingle();

    if (insertError) {
      console.error('Insert order error', insertError);
      return NextResponse.json(
        { error: '建立訂單失敗，請稍後再試。' },
        { status: 500 }
      );
    }

    if (!order?.id) {
      return NextResponse.json(
        { error: '建立訂單回傳失敗。' },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'StealthWriter Pro',
            },
            recurring: {
              interval: cycle === 'yearly' ? 'year' : 'month',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing?cancelled=1`,
      customer_email: userData.user.email ?? undefined,
      client_reference_id: order.id,
    });

    await supabase
      .from('orders')
      .update({
        stripe_link: session.url,
        stripe_session_id: session.id,
      })
      .eq('id', order.id);

    return NextResponse.json({
      orderId: order.id,
      paymentLink: session.url,
    });
  } catch (error) {
    console.error('Create order error', error);
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試。' },
      { status: 500 }
    );
  }
}

