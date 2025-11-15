import Link from 'next/link';
import { PLAN_DEFINITIONS } from '@/lib/pricing';

export const metadata = {
  title: 'StealthWriter 定價方案',
  description: '對照官方 StealthWriter Pricing，提供 Free / Basic / Standard / Premium 等方案。',
};

export default function PricingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-16 text-white">
      <div className="w-full max-w-6xl space-y-12">
        <header className="space-y-6 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">Pricing</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            依照 StealthWriter 官方方案提供完整配額
          </h1>
          <p className="text-base text-slate-300 sm:text-lg">
            方案內容與{' '}
            <a
              href="https://stealthwriter.ai/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
            >
              stealthwriter.ai/pricing
            </a>{' '}
            同步，包含 Ghost Mini / Ghost Pro 配額、單次字數上限以及客服權限。
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_DEFINITIONS.map((plan) => (
            <article
              key={plan.id}
              className={`flex flex-col rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30 ${
                plan.highlight ? 'ring-1 ring-indigo-400' : ''
              }`}
            >
              {plan.ribbon && (
                <span className="mb-4 inline-flex w-fit rounded-full border border-amber-400/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
                  {plan.ribbon}
                </span>
              )}
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <p className="text-sm text-slate-400">{plan.description}</p>
              </div>
              <div className="mt-6 space-y-1">
                <p className="text-4xl font-bold">
                  {plan.priceLabel}
                  <span className="ml-1 text-lg font-medium text-slate-400">{plan.priceValue}</span>
                </p>
                {plan.limits.maxWords && (
                  <p className="text-xs text-slate-500">
                    單次上限 {plan.limits.maxWords.toLocaleString()} 字
                  </p>
                )}
              </div>

              <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <button
                  type="button"
                  className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition ${
                    plan.highlight
                      ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                      : 'border border-slate-700 text-white hover:border-indigo-400'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </article>
          ))}
        </section>

        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-lg font-semibold">需要年度或客製方案？</p>
            <p className="text-sm text-slate-400">
              提供年度付款（兩個月免費）與團隊配額，可來信洽詢，我們會將細節同步至帳戶。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-indigo-400 hover:text-indigo-200"
          >
            返回改寫器
          </Link>
        </div>
      </div>
    </main>
  );
}


