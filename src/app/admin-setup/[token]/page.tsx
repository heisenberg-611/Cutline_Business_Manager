import Link from 'next/link';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { checkInviteToken } from '../actions';
import { SetupForm } from './SetupForm';

export const metadata = {
  title: 'Set up your admin account',
};

/**
 * Lives outside /hq on purpose. Everything under /hq is gated by middleware and
 * by the HQ layout's login screen, neither of which an invitee can pass — they
 * have no session yet, and issuing them one before they authenticate is exactly
 * the hole this flow replaces.
 */
export default async function AdminSetupPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const result = await checkInviteToken(token);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-xl shadow-lg max-w-md w-full">
        {result.valid ? (
          <>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-center">Set your master password</h2>
            <p className="text-zinc-500 mb-6 text-sm text-center">
              You have been invited to administer Cutline as{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{result.email}</span>.
              This link works once.
            </p>
            <SetupForm token={token} />
          </>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold mb-2">This link is no longer valid</h2>
            <p className="text-zinc-500 mb-6 text-sm">
              It may have expired, already been used, or been replaced by a newer
              invite. Ask an existing admin to send you a fresh one.
            </p>
            <Link
              href="/hq"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-6 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
