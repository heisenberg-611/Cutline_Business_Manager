/**
 * Script: seed-local.ts
 * Purpose: Populates the local Docker Postgres with a mock BUSINESS-tier agency
 *          (multiple members, clients, projects, a workflow) so team-collaboration
 *          features can be exercised without touching the hosted database.
 *
 * Run via: npm run db:seed   (which exports the local DATABASE_URL first)
 *
 * To sign in against this data, create the org + users in Clerk first, then map
 * their real IDs onto the fixture:
 *
 *   SEED_ORG_ID=org_xxx \
 *   SEED_ADMIN_USER_ID=user_xxx \
 *   SEED_EDITOR_USER_ID=user_yyy \
 *   SEED_MEMBER_USER_ID=user_zzz \
 *   npm run db:seed
 *
 * Any slot left unset keeps its mock ID — inspectable in the DB, but not
 * loggable-in, since Clerk has no such user.
 *
 * Safety: refuses to run unless DATABASE_URL points at a local host. Collaboration
 * work needs several users in one org, which no hosted environment should be
 * reshaped to provide.
 */
import { PrismaClient, type Client, type Project, type WorkflowStage } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";

// Guard: only ever run against the Docker container.
const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);
if (!isLocal) {
  console.error(
    "❌ Refusing to seed: DATABASE_URL is not a local database.\n" +
      "   This script only runs against the Docker Postgres on localhost:55432.\n" +
      "   Use `npm run db:seed`, which sets the local URL for you."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

// Business.id must equal a Clerk orgId for the app to resolve a session (see
// api/webhooks/clerk/route.ts). Pass your real Clerk org/user IDs to sign in
// against this data; otherwise you get a DB-only fixture you can inspect but
// not log into.
//   SEED_ORG_ID=org_xxx SEED_ADMIN_USER_ID=user_xxx npm run db:seed
const BUSINESS_ID = process.env.SEED_ORG_ID || "org_local_mock_agency";

// Fixture row IDs are namespaced per business. Without this, re-seeding onto a
// different orgId silently no-ops (the fixed IDs already exist) and leaves the
// new business with members but no clients or projects.
const SFX = BUSINESS_ID.replace(/[^a-zA-Z0-9]/g, "").slice(-16);

// Each slot takes a real Clerk user ID via env. User.email is @unique, so an
// overridden slot gets a +suffix address — otherwise it collides with the row
// left behind by an earlier run.
function member(
  envVar: string,
  fallbackId: string,
  handle: string,
  firstName: string,
  lastName: string,
  role: string
) {
  const override = process.env[envVar];
  const id = override || fallbackId;
  return {
    id,
    email: override ? `${handle}+${id}@mockagency.test` : `${handle}@mockagency.test`,
    firstName,
    lastName,
    role,
  };
}

// The app treats User.id as the Clerk user ID, so these must match Clerk
// exactly for a real session to resolve. See api/webhooks/clerk/route.ts.
const MEMBERS = [
  member("SEED_ADMIN_USER_ID", "user_local_admin", "ada", "Ada", "Reyes", "org:admin"),
  member("SEED_EDITOR_USER_ID", "user_local_editor", "kai", "Kai", "Osei", "org:member"),
  member("SEED_MEMBER_USER_ID", "user_local_member", "juno", "Juno", "Park", "org:member"),
];

const STAGES = [
  "Idea / Discovery",
  "Planning & Prep",
  "Drafting / Execution",
  "Internal Review",
  "Client Feedback",
  "Delivered",
];

/** Display name as actually stored, falling back to the fixture name. */
async function nameOf(userId: string, fallback: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  })
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || fallback
}

async function main() {
  console.log(`🌱 Seeding mock agency into ${url.replace(/:[^:@]*@/, ":***@")}\n`);

  await prisma.business.upsert({
    where: { id: BUSINESS_ID },
    update: { subscriptionPlan: "BUSINESS" },
    create: {
      id: BUSINESS_ID,
      name: "Mock Creative Agency",
      // Collaboration is BUSINESS-tier only, so the fixture must be on that plan.
      subscriptionPlan: "BUSINESS",
      realtimeMessagesEnabled: true,
      clientSequence: 2,
      projectSequence: 3,
    },
  });
  console.log(`  ✓ Business "Mock Creative Agency" (${BUSINESS_ID})`);

  for (const m of MEMBERS) {
    await prisma.user.upsert({
      where: { id: m.id },
      // Empty update: when seeding onto a real Clerk user ID, keep their
      // webhook-synced name/email rather than overwriting it with fixture data.
      update: {},
      create: { id: m.id, email: m.email, firstName: m.firstName, lastName: m.lastName },
    });
    await prisma.businessMembership.upsert({
      where: { businessId_userId: { businessId: BUSINESS_ID, userId: m.id } },
      update: { role: m.role },
      create: { businessId: BUSINESS_ID, userId: m.id, role: m.role },
    });
    console.log(`  ✓ ${m.firstName} ${m.lastName} (${m.role})`);
  }

  const template = await prisma.workflowTemplate.upsert({
    where: { id: `wft_${SFX}` },
    update: {},
    create: { id: `wft_${SFX}`, businessId: BUSINESS_ID, name: "Default Pipeline" },
  });

  const stages: WorkflowStage[] = [];
  for (const [i, name] of STAGES.entries()) {
    stages.push(
      await prisma.workflowStage.upsert({
        where: { id: `wfs_${SFX}_${i}` },
        update: { name, orderIndex: i },
        create: { id: `wfs_${SFX}_${i}`, templateId: template.id, name, orderIndex: i },
      })
    );
  }
  console.log(`  ✓ Workflow template with ${stages.length} stages`);

  const clients: Client[] = [];
  for (const [i, c] of [
    { name: "Northwind Studios", email: "hello@northwind.test" },
    { name: "Ridgeline Coffee", email: "team@ridgeline.test" },
  ].entries()) {
    // Upsert on the natural key (@@unique([businessId, displayId])) rather than a
    // synthetic id, so re-running matches whatever row already holds CL-00n.
    clients.push(
      await prisma.client.upsert({
        where: {
          businessId_displayId: {
            businessId: BUSINESS_ID,
            displayId: `CL-${String(i + 1).padStart(3, "0")}`,
          },
        },
        update: {},
        create: {
          businessId: BUSINESS_ID,
          displayId: `CL-${String(i + 1).padStart(3, "0")}`,
          displayName: c.name,
          companyName: c.name,
          email: c.email,
        },
      })
    );
  }
  console.log(`  ✓ ${clients.length} clients`);

  // Deliberate mix so every authorization branch is reachable:
  //  - PR-001 has two members (the case single-assignee could not express)
  //  - PR-002 has a lone owner
  //  - PR-003 has no members at all
  const projects = [
    {
      title: "Brand Launch Film",
      clientIdx: 0,
      stageIdx: 2,
      assignee: MEMBERS[1].id,
      members: [
        { userId: MEMBERS[1].id, role: "OWNER" as const },
        { userId: MEMBERS[2].id, role: "COLLABORATOR" as const },
      ],
    },
    {
      title: "Q3 Social Cutdowns",
      clientIdx: 0,
      stageIdx: 4,
      assignee: MEMBERS[2].id,
      members: [{ userId: MEMBERS[2].id, role: "OWNER" as const }],
    },
    { title: "Packaging Photography", clientIdx: 1, stageIdx: 1, assignee: null, members: [] },
  ];

  const projectRows: Project[] = [];
  for (const [i, p] of projects.entries()) {
    const row = await prisma.project.upsert({
      where: {
        businessId_displayId: {
          businessId: BUSINESS_ID,
          displayId: `PR-${String(i + 1).padStart(3, "0")}`,
        },
      },
      update: {},
      create: {
        businessId: BUSINESS_ID,
        displayId: `PR-${String(i + 1).padStart(3, "0")}`,
        clientId: clients[p.clientIdx].id,
        title: p.title,
        statusStageId: stages[p.stageIdx].id,
        assigneeId: p.assignee,
        orderIndex: i,
      },
    });
    projectRows.push(row)

    // Projects created with a statusStageId but no history row cannot be
    // measured by the at-risk checks, which read stageHistory[0].
    const hasHistory = await prisma.projectStageHistory.findFirst({
      where: { projectId: row.id, exitedAt: null },
      select: { id: true },
    })
    if (!hasHistory && row.statusStageId) {
      await prisma.projectStageHistory.create({
        data: { projectId: row.id, stageId: row.statusStageId },
      })
    };

    // The backfill migration only covers projects that existed when it ran, so
    // freshly seeded rows need their membership written here too.
    for (const m of p.members) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: row.id, userId: m.userId } },
        update: { role: m.role },
        create: { projectId: row.id, userId: m.userId, role: m.role, addedBy: MEMBERS[0].id },
      });
    }
    console.log(
      `  ✓ Project "${p.title}" → ${p.assignee ?? "unassigned"} (${p.members.length} member${p.members.length === 1 ? "" : "s"})`
    );
  }

  // Exercise Task + threaded Comment + Mention so the new tables are proven to
  // work end-to-end, not merely created.
  const brandFilm = projectRows[0];
  const taskFixtures = [
    { title: "Lock the edit", status: "IN_PROGRESS" as const, assigneeId: MEMBERS[1].id },
    { title: "Colour grade pass", status: "TODO" as const, assigneeId: MEMBERS[2].id },
    { title: "Export deliverables", status: "TODO" as const, assigneeId: null },
  ];
  for (const [i, t] of taskFixtures.entries()) {
    const existing = await prisma.task.findFirst({
      where: { projectId: brandFilm.id, title: t.title },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          businessId: BUSINESS_ID,
          projectId: brandFilm.id,
          title: t.title,
          status: t.status,
          assigneeId: t.assigneeId,
          orderIndex: i,
          createdBy: MEMBERS[0].id,
        },
      });
    }
  }
  console.log(`  ✓ ${taskFixtures.length} tasks on "${brandFilm.title}"`);

  const existingComment = await prisma.comment.findFirst({
    where: { entityType: "Project", entityId: brandFilm.id, parentId: null },
  });
  if (!existingComment) {
    const root = await prisma.comment.create({
      data: {
        businessId: BUSINESS_ID,
        entityType: "Project",
        entityId: brandFilm.id,
        authorId: MEMBERS[0].id,
        // Structured mention token — a bare "@Kai" is intentionally not parsed.
        // The display name is read back from the row rather than taken from the
        // fixture, so when seeding onto real Clerk ids the chip shows the real
        // person's name instead of "Kai Osei".
        body: `Client wants the logo sting shortened. @[${await nameOf(MEMBERS[1].id, `${MEMBERS[1].firstName} ${MEMBERS[1].lastName}`)}](${MEMBERS[1].id}) can you take this?`,
        mentions: { create: [{ mentionedUserId: MEMBERS[1].id }] },
      },
    });
    await prisma.comment.create({
      data: {
        businessId: BUSINESS_ID,
        entityType: "Project",
        entityId: brandFilm.id,
        authorId: MEMBERS[1].id,
        parentId: root.id,
        body: "On it — will have a new cut up tomorrow.",
      },
    });
    console.log(`  ✓ Comment thread (1 root + 1 reply, 1 mention)`);
  } else {
    console.log(`  ✓ Comment thread already present`);
  }

  console.log("\n✅ Seed complete.");
  console.log(`   Business ID (Clerk orgId): ${BUSINESS_ID}`);
  console.log(`   Admin: ${MEMBERS[0].email} | Members: ${MEMBERS.slice(1).map(m => m.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
