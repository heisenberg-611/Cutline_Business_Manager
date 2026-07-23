import prisma from '@/modules/core/db/prisma';
import { PLAN_PRICES } from '@/lib/subscription';
import { requireAdmin } from '../actions';
import { DeleteRequestButton } from './DeleteRequestButton';
import { PaginationControls } from '../components/PaginationControls';

export const metadata = {
  title: 'Finances Admin',
};

export default async function AdminFinancesPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const resolvedParams = await props.searchParams;
  const currentPage = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const ITEMS_PER_PAGE = 20;

  const [totalRequests, approvedRequests, groupedRevenue] = await prisma.$transaction([
    prisma.subscriptionRequest.count({ where: { status: 'APPROVED' } }),
    prisma.subscriptionRequest.findMany({
      where: { status: 'APPROVED' },
      orderBy: { updatedAt: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      include: { business: { select: { name: true } } },
    }),
    prisma.subscriptionRequest.groupBy({
      by: ['planRequested'],
      where: { status: 'APPROVED' },
      _count: { id: true }
    })
  ]);

  const totalPages = Math.ceil(totalRequests / ITEMS_PER_PAGE);

  const totalRevenue = groupedRevenue.reduce((acc, group) => {
    return acc + (group._count.id * (PLAN_PRICES[group.planRequested as keyof typeof PLAN_PRICES] || 0));
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Global Finances</h2>
        <p className="text-sm text-zinc-500">Track total revenue collected from manual subscriptions.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-8 max-w-sm">
        <p className="text-sm text-zinc-500 font-medium">Total Revenue (All Time)</p>
        <h3 className="text-4xl font-bold text-green-600 mt-2">৳{totalRevenue.toLocaleString()}</h3>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date Approved</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-950 divide-y divide-zinc-200 dark:divide-zinc-800">
            {approvedRequests.map((req) => (
              <tr key={req.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                  {new Date(req.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {req.business.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 capitalize">
                  {req.planRequested.toLowerCase()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  ৳{PLAN_PRICES[req.planRequested as keyof typeof PLAN_PRICES]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DeleteRequestButton requestId={req.id} />
                </td>
              </tr>
            ))}
            {approvedRequests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                  No approved payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {totalPages > 1 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800">
            <PaginationControls 
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalRequests}
            />
          </div>
        )}
      </div>
    </div>
  );
}
