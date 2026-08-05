/**
 * Script: backfill-business-owner.ts
 * Purpose: Fills Business.ownerUserId for organizations that predate the column,
 *          reading createdBy from Clerk.
 *
 * Why this exists:
 * - The seat lock keeps exactly one seat working when a business drops below the
 *   BUSINESS plan: the owner's. A business with a null ownerUserId has no owner
 *   to exempt, so it must be backfilled before the lock can be trusted.
 * - Safe to re-run: only rows with a null ownerUserId are touched, and a
 *   business Clerk no longer knows about is reported and skipped rather than
 *   guessed at.
 *
 * Usage: npm run backfill-owners
 *
 * Note: @clerk/backend is used directly rather than @clerk/nextjs/server, whose
 * clerkClient() expects a Next request context that a plain tsx script has no
 * way to provide. It resolves as a pinned transitive dependency of
 * @clerk/nextjs; it is deliberately not promoted to a direct dependency,
 * because running npm install to add it prunes the other platforms'
 * @next/swc-* binaries out of the lockfile and breaks the Linux CI build.
 */
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

const prisma = new PrismaClient();

async function main() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set — cannot reach Clerk.");
  }

  const clerk = createClerkClient({ secretKey });

  const pending = await prisma.business.findMany({
    where: { ownerUserId: null },
    select: { id: true, name: true },
  });

  if (pending.length === 0) {
    console.log("✅ Every business already has an owner. Nothing to do.");
    return;
  }

  console.log(`🔍 Found ${pending.length} business(es) without an owner.\n`);

  let filled = 0;
  const unresolved: string[] = [];

  for (const business of pending) {
    try {
      const org = await clerk.organizations.getOrganization({
        organizationId: business.id,
      });

      if (!org.createdBy) {
        unresolved.push(`${business.id} (${business.name}) — Clerk has no createdBy`);
        continue;
      }

      await prisma.business.update({
        where: { id: business.id },
        data: { ownerUserId: org.createdBy },
      });

      filled++;
      console.log(`  ✓ ${business.name} → ${org.createdBy}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      unresolved.push(`${business.id} (${business.name}) — ${reason}`);
    }
  }

  console.log(`\n✅ Backfilled ${filled} of ${pending.length}.`);

  if (unresolved.length > 0) {
    // Not thrown: a business whose Clerk org was deleted is expected and must
    // not block the rest. These keep the pre-column fallback behaviour until
    // someone sets an owner by hand.
    console.warn(`\n⚠️  ${unresolved.length} could not be resolved:`);
    for (const line of unresolved) console.warn(`  - ${line}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
