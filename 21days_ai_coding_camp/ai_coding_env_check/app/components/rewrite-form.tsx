'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type RewriteResponse = {
  rewritten: string;
};

const MIN_INPUT_LENGTH = 8;

export default function RewriteForm() {
  const [input, setInput] = useState('');
  const [rewritten, setRewritten] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [copyTimer, setCopyTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer) {
        clearTimeout(copyTimer);
      }
    };
  }, [copyTimer]);

  const disabled = useMemo(
    () => loading || input.trim().length < MIN_INPUT_LENGTH,
    [loading, input]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = input.trim();
      if (text.length < MIN_INPUT_LENGTH) {
        setError(`請至少輸入 ${MIN_INPUT_LENGTH} 個字元的內容。`);
        return;
      }

      setLoading(true);
      setError(null);
      setHasCopied(false);

      try {
        const response = await fetch('/api/rewrite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          const { error: message } = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(message || '改寫失敗，請稍後再試。');
        }

        const data = (await response.json()) as RewriteResponse;

        if (!data.rewritten?.trim()) {
          throw new Error('改寫結果為空，請重新嘗試。');
        }

        setRewritten(data.rewritten.trim());
      } catch (err) {
        console.error('Rewrite error', err);
        setError(err instanceof Error ? err.message : '服務器出現問題，請稍後再試。');
      } finally {
        setLoading(false);
      }
    },
    [input]
  );

  const handleCopy = useCallback(async () => {
    if (!rewritten) return;

    try {
      await navigator.clipboard.writeText(rewritten);
      setHasCopied(true);
      if (copyTimer) {
        clearTimeout(copyTimer);
      }
      const timer = setTimeout(() => setHasCopied(false), 2500);
      setCopyTimer(timer);
    } catch (err) {
      console.error('Copy error', err);
      setError('複製失敗，請手動選取文字複製。');
    }
  }, [rewritten, copyTimer]);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-black/20 backdrop-blur"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="rewrite-input"
            className="block text-sm font-medium uppercase tracking-wide text-slate-300"
          >
            原始內容
          </label>
          <textarea
            id="rewrite-input"
            name="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="貼上想要去除 AI 味道的內容..."
            rows={6}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-base text-slate-100 shadow-inner shadow-black/20 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
          />
          <p className="text-xs text-slate-500">
            輸入至少 {MIN_INPUT_LENGTH} 個字元，系統會保留原意並調整語氣與節奏。
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                改寫中…
              </>
            ) : (
              '改寫'
            )}
          </button>

          <span className="text-xs text-slate-500">
            按下「改寫」即代表你同意我們可能會將內容傳送至 DeepSeek 進行處理。
          </span>
        </div>

        {rewritten && (
          <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-slate-200">改寫結果</h2>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-indigo-400 hover:text-indigo-200"
              >
                {hasCopied ? '已複製' : '複製'}
              </button>
            </div>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-100">
              {rewritten}
            </p>
          </section>
        )}
      </div>
    </form>
  );
}





