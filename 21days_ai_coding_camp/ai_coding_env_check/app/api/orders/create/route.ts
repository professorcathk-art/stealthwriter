import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  getSupabaseAuthClient,
} from '@/lib/supabase-admin';

const STRIPE_LINKS = {
  monthly: 'https://buy.stripe.com/test_8x2eVfbrR0effV20Zr0Ny01',
  yearly: 'https://buy.stripe.com/test_cNi14p3Zpgdd9wE0Zr0Ny00',
} as const;

type BillingCycle = 'monthly' | 'yearly';

type OrderPayload = {
  cycle: BillingCycle;
};

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
    const stripeLink = STRIPE_LINKS[cycle];

    const supabase = getSupabaseAdminClient();
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: userData.user.id,
        plan: 'pro',
        cycle,
        status: 'pending',
        stripe_link: stripeLink,
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

    return NextResponse.json({
      orderId: order.id,
      paymentLink: stripeLink,
    });
  } catch (error) {
    console.error('Create order error', error);
    return NextResponse.json(
      { error: '伺服器錯誤，請稍後再試。' },
      { status: 500 }
    );
  }
}

