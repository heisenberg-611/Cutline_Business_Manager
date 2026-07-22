import { requireAdmin } from '../actions';
import prisma from '@/modules/core/db/prisma';
import { ShieldCheck, Activity } from 'lucide-react';
import { format } from 'date-fns';

export const metadata = {
  title: 'Audit Logs | Admin',
};

export default async function AuditLogsPage() {
  await requireAdmin();

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100, // Show last 100 actions
  });

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('REVOKE') || action.includes('REJECT')) {
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 ring-red-500/10';
    }
    if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('ADD')) {
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 ring-emerald-500/10';
    }
    return 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 ring-indigo-500/10';
  };

  const formatAction = (action: string) => {
    return action.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-wide uppercase text-sm">Security</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Audit Logs</h1>
        <p className="mt-2 text-zinc-500 max-w-2xl">
          A chronological, read-only security feed of all actions taken by administrators.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 uppercase border-b border-zinc-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Admin</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Target ID</th>
                <th className="px-6 py-4 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                    {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {log.adminEmail}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${getActionColor(log.action)}`}>
                      {formatAction(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {log.targetId}
                  </td>
                  <td className="px-6 py-4">
                    {log.metadata ? (
                      <pre className="text-[10px] bg-zinc-50 dark:bg-zinc-900 p-2 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 overflow-x-auto max-w-[200px]">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">None</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
