'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type AuthMode = 'sign-in' | 'sign-up';

type AuthFormProps = {
  mode: AuthMode;
};

const MODE_COPY: Record<
  AuthMode,
  {
    title: string;
    submit: string;
    switchLabel: string;
    switchHref: string;
    switchText: string;
  }
> = {
  'sign-in': {
    title: '登入帳戶',
    submit: '登入',
    switchLabel: '還沒有帳戶？',
    switchHref: '/register',
    switchText: '立即註冊',
  },
  'sign-up': {
    title: '建立新帳戶',
    submit: '註冊',
    switchLabel: '已經有帳戶？',
    switchHref: '/login',
    switchText: '前往登入',
  },
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [{ email, password, confirmPassword }, setFields] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { title, submit, switchHref, switchLabel, switchText } = MODE_COPY[mode];

  const disabled = useMemo(() => {
    const baseInvalid = isPending || !email.trim() || password.trim().length < 6;
    if (mode === 'sign-up') {
      return baseInvalid || password !== confirmPassword;
    }
    return baseInvalid;
  }, [confirmPassword, email, isPending, mode, password]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFields((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setMessage(null);

      if (mode === 'sign-up' && password !== confirmPassword) {
        setError('請確認兩次輸入的密碼相同。');
        return;
      }

      startTransition(async () => {
        try {
          const supabase = getSupabaseBrowserClient();
          if (!supabase) {
            throw new Error('Supabase 尚未初始化，請稍後重試。');
          }

          if (mode === 'sign-up') {
            const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: origin
                ? {
                    emailRedirectTo: origin,
                  }
                : undefined,
            });

            if (signUpError) {
              throw signUpError;
            }

            setMessage('註冊成功！請到信箱點擊驗證信，或直接使用密碼登入。');
            setFields({ email, password: '', confirmPassword: '' });
          } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (signInError) {
              throw signInError;
            }

            setMessage('登入成功，為您導向首頁…');
            setTimeout(() => {
              router.push('/');
              router.refresh();
            }, 600);
          }
        } catch (err) {
          console.error('Auth error', err);
          setError(err instanceof Error ? err.message : '發生未知錯誤，請稍後再試。');
        }
      });
    },
    [confirmPassword, email, mode, password, router, startTransition]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-lg shadow-black/30 backdrop-blur"
    >
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="text-sm text-slate-400">
          使用 Email 與密碼完成 {mode === 'sign-up' ? '註冊' : '登入'}。
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            電子信箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={handleChange}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-slate-100 shadow-inner shadow-black/20 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-300">
            密碼
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={handleChange}
            required
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-slate-100 shadow-inner shadow-black/20 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
            placeholder="至少 6 位字元"
          />
        </div>

        {mode === 'sign-up' && (
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
              再次確認密碼
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-slate-100 shadow-inner shadow-black/20 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
              placeholder="請再次輸入密碼"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex w-full items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
      >
        {isPending ? '處理中…' : submit}
      </button>

      <p className="text-center text-xs text-slate-500">
        {switchLabel}{' '}
        <Link href={switchHref} className="text-indigo-300 transition hover:text-indigo-200">
          {switchText}
        </Link>
      </p>
    </form>
  );
}
