import Link from 'next/link';
import { Suspense } from 'react';
import AuthNav from './components/auth-nav';
import RewriteForm from './components/rewrite-form';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 px-4 py-16">
      <header className="flex w-full max-w-5xl items-center justify-between pb-12">
        <div />
        <AuthNav />
      </header>

      <div className="w-full max-w-3xl space-y-8">
        <header className="space-y-4 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            文案去除 AI 味改寫器
          </h1>
          <p className="text-base text-slate-300">
            貼上任何段落，點擊改寫，快速獲得更自然、貼近真人的表達。
          </p>
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">
            Ghost Mini & Ghost Pro 配額現已上線
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="rounded-full border border-slate-700 px-5 py-2 text-xs font-semibold text-white transition hover:border-indigo-400 hover:text-indigo-200"
            >
              查看定價方案
            </Link>
          </div>
        </header>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
              載入中…
            </div>
          }
        >
          <RewriteForm />
        </Suspense>
      </div>
    </main>
  );
}

