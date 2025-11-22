'use client';

import { useCallback, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { PRO_PLAN, type BillingCycle } from '@/lib/pricing';

const STRIPE_LINKS: Record<BillingCycle, string> = {
  monthly: 'https://buy.stripe.com/test_8x2eVfbrR0effV20Zr0Ny01',
  yearly: 'https://buy.stripe.com/test_cNi14p3Zpgdd9wE0Zr0Ny00',
};

export const metadata = {
  title: 'StealthWriter Pro 定價',
  description: 'Ghost Mini + Ghost Pro 改寫服務，月費 $7.99，年費 $59。',
};

type OrderResponse = {
  orderId: string;
  paymentLink: string;
};

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const client = getSupabaseBrowserClient();

  const cycleCopy = useMemo(
    () =>
      billingCycle === 'monthly'
        ? `${PRO_PLAN.price.monthly.label} / ${PRO_PLAN.price.monthly.detail}`
        : `${PRO_PLAN.price.yearly.label} / ${PRO_PLAN.price.yearly.detail}`,
    [billingCycle]
  );

  const handleSubscribe = useCallback(async () => {
    setIsSubmitting(true);
    setMessage(null);

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError || !session?.access_token) {
      setMessage('請先登入才能訂閱。');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ cycle: billingCycle }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || '建立訂單失敗。');
      }

      const data = (await response.json()) as OrderResponse;
      window.location.href = data.paymentLink;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '訂閱失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  }, [billingCycle, client]);

  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-16 text-white">
      <div className="w-full max-w-4xl space-y-8">
        <header className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">StealthWriter Pro</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            全功能訂閱
          </h1>
          <p className="text-base text-slate-300">
            立即升級可享 Ghost Mini + Ghost Pro 改寫服務，搭配月繳或年繳方案。
          </p>
        </header>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">價格</p>
              <p className="text-5xl font-bold text-white">{cycleCopy}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    billingCycle === cycle
                      ? 'bg-indigo-500 text-white'
                      : 'border border-slate-800 text-slate-300 hover:border-indigo-400'
                  }`}
                >
                  {cycle === 'monthly' ? '月繳 $7.99' : '年繳 $59'}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-sm text-slate-200">
              {PRO_PLAN.features.map((feature) => (
                <p key={feature} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" aria-hidden />
                  {feature}
                </p>
              ))}
            </div>

            {message && (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isSubmitting}
              className="w-full rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isSubmitting ? '處理中…' : '立即訂閱'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}


