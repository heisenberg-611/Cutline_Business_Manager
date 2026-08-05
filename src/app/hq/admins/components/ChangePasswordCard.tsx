'use client';

import { useState } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeAdminPassword } from '../../actions';

const MIN_LENGTH = 12;

export function ChangePasswordCard({ email }: { email: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit =
    current.length > 0 && next.length >= MIN_LENGTH && next === confirm && !isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const result = await changeAdminPassword(current, next);

    if (result.success) {
      // The session was deliberately invalidated, so a reload lands on login.
      window.location.href = '/hq';
      return;
    }

    setError(result.error ?? 'Could not change your password');
    setIsPending(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="w-5 h-5 text-zinc-500" />
        <h3 className="text-lg font-semibold">Change your password</h3>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Changing it signs you out of every device, including this one. Signed in as{' '}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={`New password (at least ${MIN_LENGTH} characters)`}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <Input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {mismatch && <p className="text-xs text-red-600">Passwords do not match.</p>}

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-3 py-2">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change password'}
        </Button>
      </form>
    </div>
  );
}
