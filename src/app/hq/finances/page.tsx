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

  const [totalRequests, approvedRequests, revenueAggregate, adminGranted] = await prisma.$transaction([
    prisma.subscriptionRequest.count({ where: { status: 'APPROVED' } }),
    prisma.subscriptionRequest.findMany({
      where: { status: 'APPROVED' },
      orderBy: { paidAt: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      include: { business: { select: { name: true } } },
    }),
    // Sums what was actually recorded as collected. Previously this multiplied
    // a count of approved requests by today's PLAN_PRICES, so changing a price
    // retroactively rewrote all-time revenue and a comped grant was billed at
    // full list. VOIDED rows are excluded by the status filter.
    prisma.subscriptionRequest.aggregate({
      where: { status: 'APPROVED' },
      _sum: { amountPaid: true },
    }),
    // Shown apart from the total. An admin-granted plan is an entitlement
    // change, and historically these were booked at full list price, which is
    // how most of the reported figure came to be money nobody had received.
    prisma.subscriptionRequest.aggregate({
      where: { status: 'APPROVED', paymentMethod: 'admin_override' },
      _sum: { amountPaid: true },
      _count: true,
    })
  ]);

  const totalPages = Math.ceil(totalRequests / ITEMS_PER_PAGE);

  const totalRevenue = revenueAggregate._sum.amountPaid ?? 0;
  const adminGrantedRevenue = adminGranted._sum.amountPaid ?? 0;
  const customerPaid = totalRevenue - adminGrantedRevenue;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Global Finances</h2>
        <p className="text-sm text-zinc-500">Track total revenue collected from manual subscriptions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-500 font-medium">Total Recorded (All Time)</p>
          <h3 className="text-3xl font-bold text-green-600 mt-2">৳{totalRevenue.toLocaleString()}</h3>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-500 font-medium">Paid by customers</p>
          <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">৳{customerPaid.toLocaleString()}</h3>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900 rounded-xl p-6">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Admin-granted</p>
          <h3 className="text-3xl font-bold text-amber-600 mt-2">৳{adminGrantedRevenue.toLocaleString()}</h3>
          <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-1">
            {adminGranted._count} grant{adminGranted._count === 1 ? '' : 's'} set by hand
          </p>
        </div>
      </div>

      {adminGrantedRevenue > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 mb-8">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            ৳{adminGrantedRevenue.toLocaleString()} of the total came from plans set by an
            admin rather than a customer payment, and was recorded automatically at list price.
            Review those rows below and correct any that were comps, tests or corrections —
            new admin grants no longer record revenue unless an amount is entered.
          </p>
        </div>
      )}

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
                  {new Date(req.paidAt ?? req.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {req.business?.name ?? <span className="italic text-zinc-400">deleted workspace</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 capitalize">
                  {req.planRequested.toLowerCase()}
                  {req.paymentMethod === 'admin_override' && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 not-italic">
                      admin grant
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  ৳{(req.amountPaid ?? PLAN_PRICES[req.planRequested as keyof typeof PLAN_PRICES] ?? 0).toLocaleString()}
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
