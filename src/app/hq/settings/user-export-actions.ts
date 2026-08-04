'use server';

import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../actions';

export type ExportUserResult = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  createdAt: string;
  organisations: string[];
};

/**
 * Typeahead for the data-subject export picker. Deliberately narrow: just
 * enough to let an admin confirm they picked the right person.
 */
export async function searchUsersForExport(query: string): Promise<ExportUserResult[]> {
  await requireAdmin(); // SECURITY CHECK

  const q = query.trim();
  if (q.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { id: q },
      ],
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      imageUrl: true,
      createdAt: true,
      memberships: { select: { business: { select: { name: true } } } },
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    createdAt: user.createdAt.toISOString(),
    organisations: user.memberships.map((m) => m.business.name),
  }));
}
