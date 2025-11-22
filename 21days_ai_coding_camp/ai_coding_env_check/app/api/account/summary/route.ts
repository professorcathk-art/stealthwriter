import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAdminClient,
  getSupabaseAuthClient,
} from '@/lib/supabase-admin';
import {
  getActivePlanDefinition,
  getTodayUsageCounter,
  todayIsoDate,
} from '@/lib/quota';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: 'Authorization missing' }, { status: 401 });
  }

  const supabaseAuth = getSupabaseAuthClient(accessToken);
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const userId = userData.user.id;
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const plan = await getActivePlanDefinition(supabase, userId, nowIso);
  const usageDate = todayIsoDate();
  const usage = await getTodayUsageCounter(supabase, userId, usageDate);

  const { data: order } = await supabase
    .from('orders')
    .select(
      'status, cycle, stripe_link, stripe_session_id, stripe_customer_id, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      'status, billing_cycle, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    plan: {
      name: plan.name,
      maxWords: plan.limits.maxWords,
      ghostMiniQuota: plan.limits.ghostMiniQuota,
      ghostProQuota: plan.limits.ghostProQuota,
    },
    usage: {
      date: usageDate,
      ghostMini: {
        used: usage?.ghost_mini_used ?? 0,
        limit: plan.limits.ghostMiniQuota,
      },
      ghostPro: {
        used: usage?.ghost_pro_used ?? 0,
        limit: plan.limits.ghostProQuota,
      },
    },
    subscription,
    order,
  });
}

