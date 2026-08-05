import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../actions';
import { DeletionQueue } from './components/DeletionQueue';
import { PaginationControls } from '../components/PaginationControls';

export const metadata = {
  title: 'Account Deletions',
};

export default async function DeletionsPage(props: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const resolvedParams = await props.searchParams;
  const currentPage = Math.max(1, parseInt(resolvedParams?.page || '1', 10));
  const ITEMS_PER_PAGE = 20;

  const [total, requests, awaiting] = await prisma.$transaction([
    prisma.accountDeletionRequest.count(),
    prisma.accountDeletionRequest.findMany({
      // Open requests first: an unsent export is the only thing here that
      // blocks someone, since nothing progresses until an admin acts.
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      take: ITEMS_PER_PAGE,
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
    }),
    prisma.accountDeletionRequest.count({ where: { status: 'AWAITING_DATA' } }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Account Deletions</h2>
        <p className="text-sm text-zinc-500">
          People who have asked to close their account. They cannot delete anything until you send
          their data export.
        </p>
      </div>

      {awaiting > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-5 py-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {awaiting} {awaiting === 1 ? 'person is' : 'people are'} waiting for their data export.
          </p>
        </div>
      )}

      <DeletionQueue
        requests={requests.map((r) => ({
          id: r.id,
          userId: r.userId,
          userEmail: r.userEmail,
          reason: r.reason,
          status: r.status,
          requestedAt: r.requestedAt.toISOString(),
          dataDeliveredAt: r.dataDeliveredAt?.toISOString() ?? null,
          deliveredBy: r.deliveredBy,
        }))}
      />

      {totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={total} />
      )}
    </div>
  );
}
