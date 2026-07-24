'use client';

import { useOptimistic, startTransition } from 'react';

import { approveUpgradeRequest, rejectUpgradeRequest } from '../upgrade-actions';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { SubscriptionPlan } from '@prisma/client';

export function UpgradeRequestsTable({ initialRequests }: { initialRequests: any[] }) {
  // Optimistic UI state
  const [optimisticRequests, addOptimisticRequest] = useOptimistic(
    initialRequests,
    (state, { id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) => {
      return state.map((req) => 
        req.id === id 
          ? { ...req, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } 
          : req
      );
    }
  );

  const handleApprove = async (id: string) => {
    startTransition(() => {
      addOptimisticRequest({ id, action: 'APPROVE' });
    });
    try {
      await approveUpgradeRequest(id);
    } catch (err) {
      console.error('Failed to approve request:', err);
    }
  };

  const handleReject = async (id: string) => {
    startTransition(() => {
      addOptimisticRequest({ id, action: 'REJECT' });
    });
    try {
      await rejectUpgradeRequest(id);
    } catch (err) {
      console.error('Failed to reject request:', err);
    }
  };

  return (
    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
      <thead className="bg-zinc-50 dark:bg-zinc-900/50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Business</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">User</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Plan</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Message</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-zinc-800">
        {optimisticRequests.map((req) => (
          <tr key={req.id} className="align-top">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {req.business.name}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
              {req.user.firstName} {req.user.lastName}<br/>
              <span className="text-xs text-zinc-400">{req.user.email}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 capitalize">
              {req.planRequested.toLowerCase()}
            </td>
            <td className="px-6 py-4 text-sm text-zinc-500 max-w-[350px] whitespace-pre-wrap break-words">
              {req.message}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <Badge variant={req.status === 'PENDING' ? 'outline' : req.status === 'APPROVED' ? 'default' : 'secondary'}>
                {req.status}
              </Badge>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              {req.status === 'PENDING' && (
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => handleApprove(req.id)}
                    className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleReject(req.id)}
                    className="p-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
        {optimisticRequests.length === 0 && (
          <tr>
            <td colSpan={6} className="px-6 py-8 text-center text-sm text-zinc-500">
              No upgrade requests found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
