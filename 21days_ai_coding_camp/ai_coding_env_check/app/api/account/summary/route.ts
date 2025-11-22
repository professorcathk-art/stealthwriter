import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import {
  getSupabaseAdminClient,
  getSupabaseAuthClient,
} from '@/lib/supabase-admin';
import {
  getActivePlanDefinition,
  getTodayUsageCounter,
  todayIsoDate,
} from '@/lib/quota';

async function getAccessTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Try to get from cookies
  const cookieStore = cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  if (accessToken) {
    return accessToken;
  }

  // Try to get session from Supabase cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Create a client with cookies to extract session
  const cookieHeader = request.headers.get('cookie') ?? '';
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Cookie: cookieHeader,
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function GET(request: NextRequest) {
  const accessToken = await getAccessTokenFromRequest(request);

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

