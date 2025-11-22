import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient, getSupabaseAuthClient } from '@/lib/supabase-admin';
import {
  getActivePlanDefinition,
  getTodayUsageCounter,
  todayIsoDate,
} from '@/lib/quota';

type AccountSummary = {
  plan: {
    name: string;
    maxWords: number | null;
    ghostMiniQuota: number | null;
    ghostProQuota: number | null;
  };
  usage: {
    date: string;
    ghostMini: {
      used: number;
      limit: number | null;
    };
    ghostPro: {
      used: number;
      limit: number | null;
    };
  };
  subscription: {
    status: string;
    billing_cycle: string;
    current_period_start: string;
    current_period_end: string;
    stripe_subscription_id?: string | null;
    stripe_customer_id?: string | null;
  } | null;
  order: {
    status: string;
    cycle: string;
    stripe_link?: string | null;
    created_at?: string | null;
    stripe_session_id?: string | null;
  } | null;
};

async function getAccountSummary(): Promise<AccountSummary | null> {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  // Create a Supabase client that reads from cookies
  const cookieHeader = cookieStore.toString();
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

  // Get session from cookies
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return null;
  }

  const accessToken = session.access_token;
  const supabaseAuth = getSupabaseAuthClient(accessToken);
  const { data: userData, error: userError } = await supabaseAuth.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return null;
  }

  const userId = userData.user.id;
  const supabaseAdmin = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const plan = await getActivePlanDefinition(supabaseAdmin, userId, nowIso);
  const usageDate = todayIsoDate();
  const usage = await getTodayUsageCounter(supabaseAdmin, userId, usageDate);

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('status, cycle, stripe_link, stripe_session_id, stripe_customer_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select(
      'status, billing_cycle, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
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
  };
}

export default async function UserPortalPage() {
  const summary = await getAccountSummary();

  if (!summary) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-white">
        <div className="rounded-3xl border border-rose-500/60 bg-rose-500/10 p-8 text-center">
          <h1 className="text-2xl font-semibold">需要登入</h1>
          <p className="mt-2 text-sm text-rose-200">
            請先登入才能檢視訂閱與計費資訊。
          </p>
        </div>
      </main>
    );
  }

  const { plan, usage, subscription, order } = summary;

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString('zh-TW') : 'N/A';

  const remaining = (limit: number | null, used: number) =>
    limit === null ? '無限' : Math.max(limit - used, 0);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-indigo-300">User Portal</p>
          <h1 className="text-3xl font-semibold">我的訂閱與配額</h1>
          <p className="text-sm text-slate-400">
            這裡會顯示你的方案、近期訂單、訂閱狀態以及每日使用量。
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-black/30">
          <h2 className="text-lg font-semibold text-white">目前方案</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <p className="text-sm text-slate-500">方案名稱</p>
              <p className="text-xl font-semibold text-white">{plan.name}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5">
              <p className="text-sm text-slate-500">單次最大字數</p>
              <p className="text-xl font-semibold text-white">
                {plan.maxWords?.toLocaleString() ?? '無限制'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-black/30">
          <h2 className="text-lg font-semibold text-white">當日使用量 ({usage.date})</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Ghost Mini</p>
              <p className="text-xl font-semibold text-white">
                {usage.ghostMini.used} / {usage.ghostMini.limit ?? '∞'} 次
              </p>
              <p className="text-xs text-slate-500">
                剩餘：{remaining(usage.ghostMini.limit, usage.ghostMini.used)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Ghost Pro</p>
              <p className="text-xl font-semibold text-white">
                {usage.ghostPro.used} / {usage.ghostPro.limit ?? '∞'} 次
              </p>
              <p className="text-xs text-slate-500">
                剩餘：{remaining(usage.ghostPro.limit, usage.ghostPro.used)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-black/30">
          <h2 className="text-lg font-semibold text-white">訂閱 / 訂單紀錄</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-200">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">最新訂閱</p>
              {subscription ? (
                <div className="space-y-1">
                  <p>
                    狀態：<span className="font-semibold text-white">{subscription.status}</span>
                  </p>
                  <p>
                    週期：{subscription.billing_cycle ?? 'N/A'}
                  </p>
                  <p>
                    週期開始：{formatDate(subscription.current_period_start)}
                  </p>
                  <p>
                    週期結束：{formatDate(subscription.current_period_end)}
                  </p>
                  <p>
                    Stripe Subscription：{' '}
                    {subscription.stripe_subscription_id ?? '尚未建立'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">尚未訂閱</p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">最新訂單</p>
              {order ? (
                <div className="space-y-1">
                  <p>狀態：{order.status}</p>
                  <p>週期：{order.cycle}</p>
                  <p>建立時間：{formatDate(order.created_at)}</p>
                  {order.stripe_link && (
                    <a
                      href={order.stripe_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-300 underline"
                    >
                      切換至 Stripe Checkout
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">尚未建立訂單</p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href="/pricing"
            className="rounded-full border border-slate-700 px-5 py-2 text-white transition hover:border-indigo-400"
          >
            查看方案
          </a>
          <a
            href="/account/portal"
            className="rounded-full border border-slate-700 px-5 py-2 text-white transition hover:border-indigo-400"
          >
            管理帳單
          </a>
        </div>
      </div>
    </main>
  );
}

