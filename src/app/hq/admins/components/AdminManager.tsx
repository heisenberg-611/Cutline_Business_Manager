'use client';

import { useState } from 'react';
import { Trash2, Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addAdmin, regenerateAdminInvite, removeAdmin } from '../../actions';

type AdminRow = {
  email: string;
  hasPassword: boolean;
  inviteExpiresAt: string | null;
  lockedUntil: string | null;
};

/** The invite link is shown once and never stored, so it must be copyable. */
function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 p-4">
      <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200 mb-1">
        Send this link to the new admin
      </p>
      <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">
        It works once, expires in 72 hours, and is not stored anywhere — if you lose
        it you will need to regenerate it.
      </p>
      <div className="flex gap-2">
        <code className="flex-1 text-xs bg-white dark:bg-zinc-950 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap border border-indigo-200 dark:border-indigo-900">
          {url}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function AdminManager({ admins }: { admins: AdminRow[] }) {
  const [email, setEmail] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);
    setPending('add');

    const result = await addAdmin(email);
    if (result.success && result.inviteUrl) {
      setInviteUrl(result.inviteUrl);
      setEmail('');
    } else {
      setError(result.error ?? 'Could not add that admin');
    }
    setPending(null);
  };

  const handleRegenerate = async (target: string) => {
    setError(null);
    setInviteUrl(null);
    setPending(target);

    const result = await regenerateAdminInvite(target);
    if (result.success && result.inviteUrl) setInviteUrl(result.inviteUrl);
    else setError(result.error ?? 'Could not regenerate the invite');
    setPending(null);
  };

  const handleRemove = async (target: string) => {
    setError(null);
    setPending(target);

    const result = await removeAdmin(target);
    if (!result.success) setError(result.error ?? 'Could not remove that admin');
    setPending(null);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-2xl">
        <h3 className="text-lg font-semibold mb-4">Invite New Admin</h3>
        <form onSubmit={handleAdd} className="flex gap-4">
          <Input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={pending === 'add'}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {pending === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Admin'}
          </Button>
        </form>

        <p className="text-xs text-zinc-500 mt-3">
          Adding an admin generates a one-time setup link. They set their own password
          through it — an invited account cannot be signed into until they do.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {inviteUrl && <InviteLink url={inviteUrl} />}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden overflow-x-auto w-full max-w-3xl">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-zinc-800">
            {admins.map((admin) => {
              const locked = admin.lockedUntil && new Date(admin.lockedUntil) > new Date();
              const inviteLive =
                admin.inviteExpiresAt && new Date(admin.inviteExpiresAt) > new Date();

              return (
                <tr key={admin.email}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {locked ? (
                      <span className="text-red-600 font-medium">Locked (failed logins)</span>
                    ) : admin.hasPassword ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : inviteLive ? (
                      <span className="text-amber-600 font-medium">Invited — not yet accepted</span>
                    ) : (
                      <span className="text-zinc-500 font-medium">Invite expired</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1">
                      {!admin.hasPassword && (
                        <button
                          type="button"
                          onClick={() => handleRegenerate(admin.email)}
                          disabled={pending === admin.email}
                          title="Generate a fresh setup link"
                          className="p-2 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(admin.email)}
                        disabled={pending === admin.email}
                        title="Remove admin"
                        className="p-2 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
