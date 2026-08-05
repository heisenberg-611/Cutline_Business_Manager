'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { acceptAdminInvite } from '../actions';

const MIN_LENGTH = 12;

export function SetupForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= MIN_LENGTH && password === confirm && !isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await acceptAdminInvite(token, password);

    if (result.success) {
      setDone(true);
      // They sign in normally rather than being handed a session, which proves
      // the password actually took.
      setTimeout(() => router.push('/hq'), 1800);
      return;
    }

    setError(result.error ?? 'Could not set your password');
    setIsPending(false);
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <p className="font-medium mb-1">Password set</p>
        <p className="text-sm text-zinc-500">Taking you to the sign-in page…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-2">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-xl border-0 py-3 px-4 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-white dark:bg-zinc-950"
        />
        <p className={`text-xs mt-2 ${tooShort ? 'text-red-600' : 'text-zinc-500'}`}>
          At least {MIN_LENGTH} characters. This password can force plan changes and
          export every user&apos;s data, so make it a strong one.
        </p>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium mb-2">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="block w-full rounded-xl border-0 py-3 px-4 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm bg-white dark:bg-zinc-950"
        />
        {mismatch && <p className="text-xs mt-2 text-red-600">Passwords do not match.</p>}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Setting password…
          </>
        ) : (
          'Set password'
        )}
      </button>
    </form>
  );
}
