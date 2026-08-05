/**
 * Script: sync-seat-caps.ts
 * Purpose: One-off rollout companion. Pushes each business's Clerk seat cap to
 *          match its active plan, and reports who the seat lock will affect.
 *
 * Why this exists:
 * - syncClerkSeatCap only runs when a plan changes or an organization is
 *   created. Businesses that existed before this rollout have hit neither path,
 *   so Clerk still has them uncapped and will happily accept invites on a Free
 *   plan. The webhook backstop catches the membership afterwards, but the point
 *   of the cap is to refuse the invite up front.
 * - Turning the seat lock on is user-visible: members of a downgraded workspace
 *   lose access the moment Business.ownerUserId is filled. The report below
 *   shows exactly who, so that is a decision rather than a surprise.
 *
 * Usage:
 *   npm run sync-seat-caps              # report only, changes nothing
 *   npm run sync-seat-caps -- --apply   # actually write the caps to Clerk
 *
 * Needs the CLERK_SECRET_KEY of the instance that owns these organizations:
 *   CLERK_SECRET_KEY=sk_live_xxx npm run sync-seat-caps
 */
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { getActivePlan, canInviteMembers } from "../src/lib/subscription";

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set — cannot reach Clerk.");
  }
  console.log(
    `Clerk key: ${secretKey.slice(0, 8)}…   mode: ${apply ? "APPLY" : "DRY RUN (no changes)"}\n`
  );

  const clerk = createClerkClient({ secretKey });

  // Same source the app uses, so a manual sync and an automatic one agree.
  const settings = await prisma.globalSettings.findUnique({
    where: { id: "default" },
    select: { businessTierSeatLimit: true },
  });
  const businessSeats = settings?.businessTierSeatLimit ?? 25;
  console.log(
    `Business seat limit: ${businessSeats}${businessSeats === 0 ? " (unlimited)" : ""}   below Business: 1\n`
  );

  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      subscriptionPlan: true,
      subscriptionPeriodEnd: true,
      ownerUserId: true,
      _count: { select: { memberships: true } },
    },
    orderBy: { name: "asc" },
  });

  let capped = 0;
  let uncapped = 0;
  const failures: string[] = [];
  // Orgs this key cannot see. Expected rather than broken: this project runs
  // local development against the production database, so it always holds some
  // rows belonging to the other Clerk instance. Reported apart from real
  // failures so a genuine error is never buried in routine noise.
  const otherInstance: string[] = [];
  const willLock: { name: string; plan: string; locked: number; noOwner: boolean }[] = [];

  const record = (id: string, name: string, error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    if (/not found/i.test(reason)) otherInstance.push(`${name} (${id})`);
    else failures.push(`${id} (${name}) — ${reason}`);
  };

  for (const b of businesses) {
    const activePlan = getActivePlan(b);
    const allowsTeam = canInviteMembers(activePlan);
    const cap = allowsTeam ? businessSeats : 1;

    // Everyone except the owner loses access once the lock is live. Reported
    // even when ownerUserId is still null, since the backfill fills it next.
    if (!allowsTeam && b._count.memberships > 1) {
      willLock.push({
        name: b.name,
        plan: activePlan,
        locked: b._count.memberships - 1,
        noOwner: !b.ownerUserId,
      });
    }

    const tally = () => {
      if (allowsTeam) uncapped++;
      else capped++;
    };

    if (!apply) {
      // Read the live value even in dry run. Otherwise this reports only what
      // the database wants and never touches Clerk, so a wrong key or a plan
      // that forbids the write looks identical to success until --apply.
      try {
        const org = await clerk.organizations.getOrganization({ organizationId: b.id });
        const drift = org.maxAllowedMemberships !== cap ? `  → would set ${cap}` : "  (already correct)";
        console.log(`  ${b.name}: Clerk has ${org.maxAllowedMemberships}${drift}`);
        tally();
      } catch (error) {
        record(b.id, b.name, error);
      }
      continue;
    }

    try {
      await clerk.organizations.updateOrganization(b.id, { maxAllowedMemberships: cap });
      tally();
    } catch (error) {
      record(b.id, b.name, error);
    }
  }

  console.log(`${apply ? "Set" : "Would set"} seat caps on ${businesses.length} business(es):`);
  console.log(`  capped to 1 (below Business): ${capped}`);
  console.log(`  set to ${businessSeats} (Business plan):${' '.repeat(Math.max(1, 8 - String(businessSeats).length))}${uncapped}`);

  if (otherInstance.length > 0) {
    console.log(
      `\nℹ️  ${otherInstance.length} org(s) not present in this Clerk instance — skipped:`
    );
    for (const line of otherInstance) console.log(`  - ${line}`);
  }

  if (failures.length > 0) {
    console.warn(`\n⚠️  ${failures.length} could not be updated:`);
    for (const line of failures) console.warn(`  - ${line}`);
  }

  if (willLock.length === 0) {
    console.log("\n✅ No members will lose access when the seat lock goes live.");
  } else {
    const total = willLock.reduce((sum, w) => sum + w.locked, 0);
    console.log(
      `\n⚠️  IMPACT: ${total} member(s) across ${willLock.length} workspace(s) lose ` +
      `dashboard access once Business.ownerUserId is filled:\n`
    );
    for (const w of willLock) {
      console.log(
        `  ${w.name} (${w.plan}) — ${w.locked} member(s)` +
        (w.noOwner ? "  [owner not yet backfilled: lock currently inert]" : "")
      );
    }
    console.log(
      "\n  Their data is untouched — re-upgrading the workspace to Business " +
      "restores access immediately, with no re-invites."
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
