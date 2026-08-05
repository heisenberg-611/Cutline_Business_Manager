/**
 * Script: verify-account-deletion.ts
 * Purpose: Proves what account deletion actually does, against a real Postgres.
 *
 * Usage:
 *   npm run db:up            # start the local Docker Postgres
 *   npm run verify-deletion
 *
 * Why this exists:
 * - Deletion is irreversible and its correctness rests on cascade rules that
 *   were only ever declared in the schema, never observed. Unit tests mock
 *   Prisma, so they can confirm the code asks for a deletion but not that the
 *   database carries it through the whole tree.
 * - It seeds two workspaces with a row in every table the cascade should reach,
 *   runs all three deletion paths, and counts rows before and after.
 *
 * Refuses to run against anything but localhost:55432, and cleans up after
 * itself. Clerk calls will fail for these synthetic ids — that path is
 * swallowed by design, and exercising it here confirms local deletion still
 * completes when Clerk is unreachable.
 */
import { PrismaClient } from '@prisma/client'
import { classifyDeletion, performAccountDeletion, DeletionBlockedError } from '../src/lib/account-deletion'

const prisma = new PrismaClient()

const SOLO_ORG = 'org_e2e_solo'
const SHARED_ORG = 'org_e2e_shared'
const SOLO_OWNER = 'user_e2e_solo_owner'
const SHARED_OWNER = 'user_e2e_shared_owner'
const MEMBER = 'user_e2e_member'

let failures = 0

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}

/** Every row in a workspace, by table, so a cascade can be observed not assumed. */
async function countsFor(businessId: string) {
  const [business, clients, projects, tasks, comments, invoices, lineItems, payments, assets, conversations, messages, participants, memberships, notifications] =
    await Promise.all([
      prisma.business.count({ where: { id: businessId } }),
      prisma.client.count({ where: { businessId } }),
      prisma.project.count({ where: { businessId } }),
      prisma.task.count({ where: { businessId } }),
      prisma.comment.count({ where: { businessId } }),
      prisma.invoice.count({ where: { businessId } }),
      prisma.invoiceLineItem.count({ where: { invoice: { businessId } } }),
      prisma.payment.count({ where: { businessId } }),
      prisma.asset.count({ where: { businessId } }),
      prisma.conversation.count({ where: { businessId } }),
      prisma.message.count({ where: { conversation: { businessId } } }),
      prisma.conversationParticipant.count({ where: { conversation: { businessId } } }),
      prisma.businessMembership.count({ where: { businessId } }),
      prisma.notification.count({ where: { businessId } }),
    ])
  return { business, clients, projects, tasks, comments, invoices, lineItems, payments, assets, conversations, messages, participants, memberships, notifications }
}

async function cleanup() {
  // Detached rows outlive their business by design, so they need clearing by
  // transaction id rather than by workspace.
  await prisma.subscriptionRequest.deleteMany({
    where: { transactionId: { in: [`TXN-${SOLO_ORG}`, `TXN-${SHARED_ORG}`] } },
  })
  await prisma.business.deleteMany({ where: { id: { in: [SOLO_ORG, SHARED_ORG] } } })
  await prisma.user.deleteMany({ where: { id: { in: [SOLO_OWNER, SHARED_OWNER, MEMBER] } } })
}

/** Builds a workspace with one row in every table the cascade should reach. */
async function seedWorkspace(businessId: string, name: string, ownerId: string, extraMemberId?: string) {
  await prisma.business.create({
    data: { id: businessId, name, ownerUserId: ownerId, subscriptionPlan: 'BUSINESS' },
  })
  await prisma.businessMembership.create({
    data: { businessId, userId: ownerId, role: 'org:admin' },
  })
  if (extraMemberId) {
    await prisma.businessMembership.create({
      data: { businessId, userId: extraMemberId, role: 'org:member' },
    })
  }

  const client = await prisma.client.create({
    data: { businessId, displayName: `${name} Client`, email: 'client@e2e.test' },
  })
  const project = await prisma.project.create({
    data: { businessId, clientId: client.id, title: `${name} Project`, assigneeId: extraMemberId ?? ownerId },
  })
  await prisma.task.create({
    data: { businessId, projectId: project.id, title: 'A task', assigneeId: extraMemberId ?? ownerId, createdBy: ownerId },
  })
  const invoice = await prisma.invoice.create({
    data: { businessId, clientId: client.id, invoiceNumber: `${name}-001`, totalCents: 10000 },
  })
  await prisma.invoiceLineItem.create({
    data: { invoiceId: invoice.id, description: 'Work', quantity: 1, amountCents: 10000 },
  })
  await prisma.payment.create({
    data: { businessId, invoiceId: invoice.id, amountCents: 10000, method: 'BANK_TRANSFER' },
  })
  await prisma.asset.create({ data: { businessId, name: 'Camera', costCents: 5000, type: 'Music' } })

  // What this customer paid Cutline. Deliberately distinct from Payment above,
  // which is what the customer's own client paid them.
  await prisma.subscriptionRequest.create({
    data: {
      businessId,
      planRequested: 'BUSINESS',
      transactionId: `TXN-${businessId}`,
      paymentMethod: 'Bkash/Nagad Personal',
      status: 'APPROVED',
      amountPaid: 299,
    },
  })
  await prisma.notification.create({
    data: { businessId, userId: ownerId, title: 'Hello', message: 'Test' },
  })

  const conversation = await prisma.conversation.create({
    data: { businessId, type: 'GROUP', createdBy: ownerId },
  })
  for (const uid of [ownerId, extraMemberId].filter(Boolean) as string[]) {
    await prisma.conversationParticipant.create({ data: { conversationId: conversation.id, userId: uid } })
    await prisma.message.create({ data: { conversationId: conversation.id, senderId: uid, content: `Message from ${uid}` } })
    await prisma.comment.create({
      data: { businessId, entityType: 'Project', entityId: project.id, body: `Comment from ${uid}`, authorId: uid },
    })
  }

  return { clientId: client.id, projectId: project.id, conversationId: conversation.id }
}

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.includes('localhost:55432')) {
    throw new Error(`Refusing to run: DATABASE_URL is not the local Docker database (${url.slice(0, 40)}…)`)
  }
  console.log(`Target: ${url}\n`)

  await cleanup()

  for (const id of [SOLO_OWNER, SHARED_OWNER, MEMBER]) {
    await prisma.user.create({ data: { id, email: `${id}@e2e.test`, firstName: 'E2E', lastName: id } })
  }

  await seedWorkspace(SOLO_ORG, 'Solo', SOLO_OWNER)
  await seedWorkspace(SHARED_ORG, 'Shared', SHARED_OWNER, MEMBER)

  console.log('SEEDED')
  console.log('  solo  ', JSON.stringify(await countsFor(SOLO_ORG)))
  console.log('  shared', JSON.stringify(await countsFor(SHARED_ORG)))

  console.log('\n1. CLASSIFICATION')
  check('solo owner is SOLO_OWNER', (await classifyDeletion(SOLO_OWNER)).kind, 'SOLO_OWNER')
  const sharedScope = await classifyDeletion(SHARED_OWNER)
  check('shared owner is SHARED_OWNER', sharedScope.kind, 'SHARED_OWNER')
  // The warning names who is blocking them, so the names have to survive the
  // round trip through the database, not just exist in the type.
  check(
    'blocking member is named in the scope',
    sharedScope.kind === 'SHARED_OWNER' ? sharedScope.memberNames : null,
    ['E2E user_e2e_member']
  )
  check(
    'blocking member count excludes the owner',
    sharedScope.kind === 'SHARED_OWNER' ? sharedScope.otherMembers : null,
    1
  )
  check('member is MEMBER_ONLY', (await classifyDeletion(MEMBER)).kind, 'MEMBER_ONLY')

  console.log('\n2. SHARED OWNER IS REFUSED, AND NOTHING CHANGES')
  const before = await countsFor(SHARED_ORG)
  let blocked = false
  try {
    await performAccountDeletion(SHARED_OWNER)
  } catch (e) {
    blocked = e instanceof DeletionBlockedError
  }
  check('deletion threw DeletionBlockedError', blocked, true)
  check('workspace untouched', await countsFor(SHARED_ORG), before)
  check('owner still exists', await prisma.user.count({ where: { id: SHARED_OWNER } }), 1)

  console.log('\n3. MEMBER LEAVES: WORDS STAY, PERSON GOES')
  await performAccountDeletion(MEMBER)
  const afterMember = await countsFor(SHARED_ORG)
  check('user row deleted', await prisma.user.count({ where: { id: MEMBER } }), 0)
  check('membership deleted', afterMember.memberships, 1)
  check('conversation participation deleted', afterMember.participants, 1)
  check('their comment REMAINS', afterMember.comments, 2)
  check('their message REMAINS', afterMember.messages, 2)
  check(
    'comment author nulled',
    await prisma.comment.count({ where: { businessId: SHARED_ORG, authorId: null } }),
    1
  )
  check(
    'message sender nulled',
    await prisma.message.count({ where: { conversation: { businessId: SHARED_ORG }, senderId: null } }),
    1
  )
  check(
    'assigned project unassigned, not deleted',
    await prisma.project.count({ where: { businessId: SHARED_ORG, assigneeId: null } }),
    1
  )
  check('workspace itself survives', afterMember.business, 1)

  console.log('\n4. SOLO OWNER LEAVES: THE WORKSPACE IS ERASED')
  await performAccountDeletion(SOLO_OWNER)
  const afterSolo = await countsFor(SOLO_ORG)
  check('user row deleted', await prisma.user.count({ where: { id: SOLO_OWNER } }), 0)
  check(
    'every table in the workspace is empty',
    afterSolo,
    { business: 0, clients: 0, projects: 0, tasks: 0, comments: 0, invoices: 0, lineItems: 0, payments: 0, assets: 0, conversations: 0, messages: 0, participants: 0, memberships: 0, notifications: 0 }
  )

  console.log('\n5. CUTLINE REVENUE SURVIVES THE DELETION')
  // The workspace is gone, but what they paid Cutline is Cutline's own business
  // and tax record. Cascading it meant a solo owner could silently erase their
  // payments from the books.
  const revenueAfter = await prisma.subscriptionRequest.aggregate({
    where: { status: 'APPROVED', transactionId: { in: [`TXN-${SOLO_ORG}`, `TXN-${SHARED_ORG}`] } },
    _sum: { amountPaid: true },
  })
  check('both payments still on the books', revenueAfter._sum.amountPaid, 598)
  check(
    'the deleted workspace payment is detached, not deleted',
    await prisma.subscriptionRequest.count({
      where: { transactionId: `TXN-${SOLO_ORG}`, businessId: null },
    }),
    1
  )
  check(
    'the surviving workspace payment stays attached',
    await prisma.subscriptionRequest.count({
      where: { transactionId: `TXN-${SHARED_ORG}`, businessId: SHARED_ORG },
    }),
    1
  )

  console.log('\n6. NO DANGLING REFERENCES TO THE DELETED MEMBER')
  // Every place their id could still be recorded. Anything non-zero here means
  // a foreign key that should cascade or null out does neither, which would
  // leave a reference to a person who no longer exists.
  const [danglingComments, danglingMessages, danglingTasks, danglingProjects, danglingMemberships, danglingParticipants, danglingNotifications] =
    await Promise.all([
      prisma.comment.count({ where: { authorId: MEMBER } }),
      prisma.message.count({ where: { senderId: MEMBER } }),
      prisma.task.count({ where: { OR: [{ assigneeId: MEMBER }, { createdBy: MEMBER }] } }),
      prisma.project.count({ where: { assigneeId: MEMBER } }),
      prisma.businessMembership.count({ where: { userId: MEMBER } }),
      prisma.conversationParticipant.count({ where: { userId: MEMBER } }),
      prisma.notification.count({ where: { userId: MEMBER } }),
    ])
  check(
    'no table still references the deleted member',
    { danglingComments, danglingMessages, danglingTasks, danglingProjects, danglingMemberships, danglingParticipants, danglingNotifications },
    { danglingComments: 0, danglingMessages: 0, danglingTasks: 0, danglingProjects: 0, danglingMemberships: 0, danglingParticipants: 0, danglingNotifications: 0 }
  )
  check('shared workspace still intact', (await countsFor(SHARED_ORG)).business, 1)

  await cleanup()
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
  if (failures > 0) process.exitCode = 1
}

main()
  .catch((e) => {
    console.error('E2E FAILED:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
