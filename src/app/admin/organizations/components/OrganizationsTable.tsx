'use client';

import { useState, useOptimistic, startTransition } from 'react';
import { EditSubscriptionModal } from './EditSubscriptionModal';
import { Settings2, Building2, Crown, Star } from 'lucide-react';
import { format } from 'date-fns';

export function OrganizationsTable({ businesses }: { businesses: any[] }) {
  const [editingBusiness, setEditingBusiness] = useState<any>(null);

  const [optimisticBusinesses, addOptimisticUpdate] = useOptimistic(
    businesses,
    (state, update: { id: string; plan: string; end: string | null }) => {
      return state.map(b => 
        b.id === update.id 
          ? { ...b, subscriptionPlan: update.plan, subscriptionPeriodEnd: update.end }
          : b
      );
    }
  );

  const getStatusBadge = (b: any) => {
    if (b.subscriptionPlan === 'FREE') {
      return <span className="inline-flex items-center rounded-md bg-zinc-50 dark:bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 ring-1 ring-inset ring-zinc-500/10 dark:ring-zinc-400/20">Free</span>;
    }
    
    if (b.subscriptionPeriodEnd && new Date(b.subscriptionPeriodEnd) < new Date()) {
      return <span className="inline-flex items-center rounded-md bg-red-50 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/10 dark:ring-red-400/20">Expired</span>;
    }
    
    if (b.subscriptionPlan === 'BUSINESS') {
      return <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-400/20">Business Active</span>;
    }

    return <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-400/20">Pro Active</span>;
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 uppercase border-b border-zinc-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">Organization</th>
                <th className="px-6 py-4 font-medium">Current Plan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Expires On</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
              {optimisticBusinesses.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{b.name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{b.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                      {b.subscriptionPlan === 'BUSINESS' ? (
                        <Crown className="w-4 h-4 text-indigo-500" />
                      ) : b.subscriptionPlan === 'PRO' ? (
                        <Star className="w-4 h-4 text-emerald-500" />
                      ) : null}
                      <span className="capitalize">{b.subscriptionPlan.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(b)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                    {b.subscriptionPeriodEnd ? (
                      <span className="tabular-nums">{format(new Date(b.subscriptionPeriodEnd), 'MMM dd, yyyy')}</span>
                    ) : (
                      <span className="italic text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingBusiness(b)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-md transition-colors"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              
              {optimisticBusinesses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingBusiness && (
        <EditSubscriptionModal 
          business={editingBusiness} 
          onClose={() => setEditingBusiness(null)} 
          onOptimisticUpdate={(plan: string, end: string | null) => {
            startTransition(() => {
              addOptimisticUpdate({ id: editingBusiness.id, plan, end });
            });
          }}
        />
      )}
    </>
  );
}
