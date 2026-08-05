import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../actions';
import { AdminManager } from './components/AdminManager';

export const metadata = {
  title: 'Manage Admins',
};

export default async function ManageAdminsPage() {
  await requireAdmin();

  const admins = await prisma.globalAdmin.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      email: true,
      passwordHash: true,
      inviteExpiresAt: true,
      lockedUntil: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Global Admins</h2>
        <p className="text-sm text-zinc-500">Manage who has access to this global admin panel.</p>
      </div>

      <AdminManager
        admins={admins.map((a) => ({
          email: a.email,
          // Never send the hash to the client — only whether one exists.
          hasPassword: a.passwordHash !== null,
          inviteExpiresAt: a.inviteExpiresAt?.toISOString() ?? null,
          lockedUntil: a.lockedUntil?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
