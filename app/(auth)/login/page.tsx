import Link from 'next/link';
import AuthForm from '@/app/components/auth-form';

export const metadata = {
  title: '登入帳戶',
  description: '使用 Email 與密碼登入。',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16">
      <div className="w-full max-w-5xl space-y-10">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400 hover:text-indigo-200"
          >
            ← 返回首頁
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </main>
  );
}



