import { requireAdmin } from '../actions';
import prisma from '@/modules/core/db/prisma';
import { Megaphone } from 'lucide-react';
import { BroadcastClient } from './components/BroadcastClient';

export const metadata = {
  title: 'Global Broadcasts | Admin',
};

export default async function BroadcastsPage() {
  await requireAdmin();

  const alerts = await prisma.systemAlert.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <Megaphone className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-wide uppercase text-sm">System</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Global Broadcasts</h1>
        <p className="mt-2 text-zinc-500 max-w-2xl">
          Create and manage system-wide alerts that appear at the top of the dashboard for all users.
        </p>
      </div>

      <BroadcastClient alerts={alerts} />
    </div>
  );
}
