import prisma from '@/modules/core/db/prisma';
import { approveRequest, rejectRequest } from './actions';
import { requireAdmin } from '../actions';
import { PaginationControls } from '../components/PaginationControls';
import { SubscriptionRequestsTable } from './components/SubscriptionRequestsTable';

export const metadata = {
  title: 'Subscriptions Admin',
};

export default async function AdminSubscriptionsPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const resolvedParams = await props.searchParams;
  const currentPage = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const ITEMS_PER_PAGE = 20;

  const [totalRequests, requests] = await prisma.$transaction([
    prisma.subscriptionRequest.count(),
    prisma.subscriptionRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      include: { business: { select: { name: true } } },
    })
  ]);

  const totalPages = Math.ceil(totalRequests / ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Subscription Requests</h2>
        <p className="text-sm text-zinc-500">Approve or reject manual payments submitted by users.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        <SubscriptionRequestsTable initialRequests={requests} />
        <PaginationControls 
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalRequests}
        />
      </div>
    </div>
  );
}
