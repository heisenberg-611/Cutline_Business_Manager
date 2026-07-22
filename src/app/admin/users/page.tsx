import { requireAdmin } from '../actions';
import prisma from '@/modules/core/db/prisma';
import { Users as UsersIcon, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { SearchUsers } from './components/SearchUsers';
import { Suspense } from 'react';

export const metadata = {
  title: 'Users Directory | Admin',
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();

  const resolvedParams = await searchParams;
  const query = resolvedParams?.q || '';

  const users = await prisma.user.findMany({
    where: query ? {
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ]
    } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: {
        include: {
          business: true
        }
      }
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <UsersIcon className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-wide uppercase text-sm">Directory</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">User Management</h1>
          <p className="mt-2 text-zinc-500 max-w-2xl">
            View all registered users and the organizations they belong to.
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-full max-w-sm bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-md" />}>
          <SearchUsers />
        </Suspense>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 uppercase border-b border-zinc-200 dark:border-white/10">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium">Organizations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.imageUrl ? (
                        <img src={user.imageUrl} alt={user.email} className="w-10 h-10 rounded-full bg-zinc-100 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-xs text-zinc-500">{user.email}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                    <span className="tabular-nums">{format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                  </td>
                  <td className="px-6 py-4">
                    {user.memberships.length > 0 ? (
                      <div className="space-y-2">
                        {user.memberships.map((membership) => (
                          <div key={membership.id} className="flex items-center gap-2 text-xs">
                            <Building2 className="w-3 h-3 text-zinc-400" />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">{membership.business.name}</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-500">
                              {membership.role.replace('org:', '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No organizations</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500">
                    No users found.
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
