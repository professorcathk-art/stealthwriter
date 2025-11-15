'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type AuthStatus =
  | { state: 'loading' }
  | { state: 'signed-out' }
  | { state: 'signed-in'; email?: string | null };

export default function AuthNav() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ state: 'loading' });
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthStatus({ state: 'signed-out' });
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        const session = data.session;
        setAuthStatus(
          session
            ? { state: 'signed-in', email: session.user.email }
            : { state: 'signed-out' }
        );
      })
      .catch((error) => {
        console.error('Get session error', error);
        if (isMounted) {
          setAuthStatus({ state: 'signed-out' });
        }
      });

    const {
      data: subscription,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(
        session
          ? { state: 'signed-in', email: session.user.email }
          : { state: 'signed-out' }
      );
      router.refresh();
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthStatus({ state: 'signed-out' });
      router.refresh();
    } catch (error) {
      console.error('Sign out error', error);
    } finally {
      setSigningOut(false);
    }
  }, [router, supabase]);

  const content = useMemo(() => {
    if (authStatus.state === 'loading') {
      return (
        <span className="rounded-full border border-slate-800 px-4 py-2 text-xs text-slate-500">
          驗證狀態載入中…
        </span>
      );
    }

    if (authStatus.state === 'signed-in') {
      return (
        <div className="flex items-center gap-3">
          {authStatus.email && (
            <span className="rounded-full border border-slate-800 px-4 py-2 text-xs text-slate-300">
              {authStatus.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-400 hover:text-rose-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            {signingOut ? '登出中…' : '登出'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400 hover:text-indigo-200"
        >
          登入
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
        >
          註冊
        </Link>
      </div>
    );
  }, [authStatus, handleSignOut, signingOut]);

  return <nav>{content}</nav>;
}





