import prisma from '@/modules/core/db/prisma';

/**
 * Builds a complete, plain-English record of everything the platform stores
 * about one user — the thing you hand over when someone asks "what do you
 * have on me?".
 *
 * The bundle is deliberately render-agnostic: every value is already formatted
 * for a human reader, so the HTML report and the JSON download are the same
 * data in two wrappers.
 */

export type ExportValue = string | number | boolean | null;

export type ExportSection = {
  id: string;
  title: string;
  /** Plain-English explanation of what this section is, for a non-technical reader. */
  description: string;
  columns: { key: string; label: string }[];
  rows: Record<string, ExportValue>[];
  /** Shown instead of the table when there are no records. */
  emptyText: string;
};

export type UserExportBundle = {
  generatedAt: string;
  subject: {
    id: string;
    email: string;
    name: string;
  };
  summary: { label: string; value: string }[];
  sections: ExportSection[];
};

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});
const DATE_ONLY = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

const fmtDateTime = (d: Date | null | undefined) => (d ? `${DATE_TIME.format(d)} UTC` : '—');
const fmtDate = (d: Date | null | undefined) => (d ? DATE_ONLY.format(d) : '—');
const fmtText = (s: string | null | undefined) => (s && s.trim().length > 0 ? s : '—');
/** Money is stored in cents; show it the way the user would see it in the app. */
const fmtMoney = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
};

const titleCase = (slug: string) =>
  slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Preferences are stored as JSON blobs. Dumping them raw would be honest but
 * unreadable, so each known shape gets spelled out as a sentence.
 */
const fmtVisibility = (value: unknown, key: 'href' | 'id', noun: string) => {
  if (!Array.isArray(value) || value.length === 0) return 'Using the standard layout';
  const entries = value as Record<string, unknown>[];
  const label = (entry: Record<string, unknown>) =>
    titleCase(String(entry[key] ?? '').split('/').filter(Boolean).pop() ?? 'unknown');
  const hidden = entries.filter((e) => e.visible === false).map(label);
  const shown = entries.filter((e) => e.visible !== false).map(label);
  return hidden.length === 0
    ? `All ${noun} visible: ${shown.join(', ')}`
    : `Hidden: ${hidden.join(', ')}. Visible: ${shown.join(', ')}`;
};

const fmtNotificationPrefs = (value: unknown) => {
  if (!value || typeof value !== 'object') return 'Using the standard settings';
  const prefs = value as { tone?: string; dnd?: boolean };
  return [
    `Do not disturb: ${prefs.dnd ? 'on' : 'off'}`,
    `Alert sound: ${prefs.tone ? titleCase(prefs.tone) : 'default'}`,
  ].join(' · ');
};

/** Distinct, non-empty ids — keeps the `IN (...)` lists tight. */
function ids(...groups: (string | null | undefined)[][]): string[] {
  const set = new Set<string>();
  for (const group of groups) {
    for (const id of group) if (id) set.add(id);
  }
  return Array.from(set);
}

const ROLE_LABELS: Record<string, string> = {
  'org:admin': 'Owner / Admin',
  'org:member': 'Team member',
  OWNER: 'Owner',
  COLLABORATOR: 'Collaborator',
  WATCHER: 'Watcher (read-only)',
};
const roleLabel = (role: string) => ROLE_LABELS[role] ?? role;

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Not started',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Declined',
  NEW: 'New',
  REVIEWED: 'Reviewed',
  RESOLVED: 'Resolved',
};
const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;

const CONVERSATION_TYPES: Record<string, string> = {
  DIRECT: 'Direct message',
  GROUP: 'Group chat',
  BROADCAST: 'Announcement channel',
  GUEST_LINK: 'Shared client link',
};

/**
 * Returns `null` when no such user exists.
 *
 * Reads run in three waves: the flat rows that hang off the user, then the
 * records those rows point at, then the organisations everything belongs to.
 * Each wave is a single parallel burst, so the whole export is three round
 * trips rather than one query per relation.
 */
export async function collectUserData(userId: string): Promise<UserExportBundle | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const [
    memberships,
    upgradeRequests,
    leadProjects,
    projectMemberships,
    assignedTasks,
    createdTasks,
    comments,
    mentions,
    notes,
    timeEntries,
    chatMemberships,
    messages,
    startedConversations,
    notifications,
    activity,
    productFeedback,
    contactMessages,
  ] = await Promise.all([
    prisma.businessMembership.findMany({
      where: { userId },
      select: { businessId: true, role: true, weeklyCapacityHours: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.upgradeRequest.findMany({
      where: { userId },
      select: { businessId: true, planRequested: true, message: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.findMany({
      where: { assigneeId: userId },
      select: { id: true },
    }),
    prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId },
      select: {
        businessId: true,
        projectId: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.findMany({
      where: { createdBy: userId, assigneeId: { not: userId } },
      select: { businessId: true, projectId: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      select: {
        businessId: true,
        entityType: true,
        entityId: true,
        body: true,
        parentId: true,
        createdAt: true,
        editedAt: true,
        deletedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.mention.findMany({
      where: { mentionedUserId: userId },
      select: {
        readAt: true,
        createdAt: true,
        comment: {
          select: { businessId: true, entityType: true, entityId: true, body: true, authorId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.note.findMany({
      where: { createdBy: userId },
      select: { projectId: true, type: true, content: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.timeEntry.findMany({
      where: { userId },
      select: {
        projectId: true,
        startedAt: true,
        endedAt: true,
        durationMinutes: true,
        isBillable: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, isMuted: true, lastReadAt: true, joinedAt: true, deletedAt: true },
      orderBy: { joinedAt: 'desc' },
    }),
    prisma.message.findMany({
      where: { senderId: userId },
      select: { conversationId: true, content: true, createdAt: true, deletedAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.conversation.findMany({
      where: { createdBy: userId },
      select: { id: true },
    }),
    prisma.notification.findMany({
      where: { userId },
      select: { businessId: true, title: true, message: true, type: true, isRead: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { actorUserId: userId },
      select: { businessId: true, entityType: true, entityId: true, action: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.platformFeedback.findMany({
      where: { OR: [{ userId }, { email: user.email }] },
      select: { type: true, message: true, url: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.systemContactMessage.findMany({
      where: { email: user.email },
      select: { name: true, message: true, source: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // --- Wave 2: resolve the records the rows above point at ------------------
  const commentTargets = [...comments, ...mentions.map((m) => m.comment)];
  const targetsOfType = (type: string) =>
    commentTargets.filter((c) => c.entityType === type).map((c) => c.entityId);

  const activityOfType = (type: string) =>
    activity.filter((a) => a.entityType === type).map((a) => a.entityId);

  const projectIds = ids(
    leadProjects.map((p) => p.id),
    projectMemberships.map((m) => m.projectId),
    assignedTasks.map((t) => t.projectId),
    createdTasks.map((t) => t.projectId),
    notes.map((n) => n.projectId),
    timeEntries.map((t) => t.projectId),
    activityOfType('Project'),
    targetsOfType('Project'),
  );

  const taskIds = ids(targetsOfType('Task'), activityOfType('Task'));
  const invoiceIds = ids(targetsOfType('Invoice'), activityOfType('Invoice'));
  const paymentIds = ids(activityOfType('Payment'));
  const expenseIds = ids(activityOfType('Expense'));
  const conversationIds = ids(
    chatMemberships.map((c) => c.conversationId),
    messages.map((m) => m.conversationId),
    startedConversations.map((c) => c.id),
    activityOfType('Broadcast'), // broadcast audit rows point at the conversation
  );
  // Received messages come from the threads they are actually a participant of,
  // not every thread they happen to have posted in.
  const joinedConversationIds = ids(chatMemberships.map((c) => c.conversationId));

  const [
    projectRows,
    taskRows,
    invoiceRows,
    paymentRows,
    expenseRows,
    conversationRows,
    receivedMessages,
  ] = await Promise.all([
    projectIds.length
      ? prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: {
            id: true,
            title: true,
            displayId: true,
            businessId: true,
            deadline: true,
            isArchived: true,
            client: { select: { displayName: true } },
            statusStage: { select: { name: true } },
          },
        })
      : [],
    taskIds.length
      ? prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true } })
      : [],
    invoiceIds.length
      ? prisma.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: { id: true, invoiceNumber: true },
        })
      : [],
    paymentIds.length
      ? prisma.payment.findMany({
          where: { id: { in: paymentIds } },
          select: { id: true, amountCents: true, businessId: true, invoice: { select: { invoiceNumber: true, currency: true } } },
        })
      : [],
    expenseIds.length
      ? prisma.expense.findMany({
          where: { id: { in: expenseIds } },
          select: { id: true, amountCents: true, currency: true, category: true, description: true },
        })
      : [],
    conversationIds.length
      ? prisma.conversation.findMany({
          where: { id: { in: conversationIds } },
          select: { id: true, title: true, type: true, businessId: true, guestName: true },
        })
      : [],
    joinedConversationIds.length
      ? prisma.message.findMany({
          where: {
            conversationId: { in: joinedConversationIds },
            // Retracted messages stay out: the app hides them from the recipient,
            // so the export must not become a way to read them back.
            deletedAt: null,
            // Guests have a null senderId, which a bare `not` would filter out.
            OR: [{ senderId: null }, { senderId: { not: userId } }],
          },
          select: {
            conversationId: true,
            senderId: true,
            isGuest: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [],
  ]);

  // Map generics are spelled out: Prisma's row types defeat `new Map()` inference.
  const projectMap = new Map<string, (typeof projectRows)[number]>(
    projectRows.map((p) => [p.id, p]),
  );
  const taskMap = new Map<string, (typeof taskRows)[number]>(taskRows.map((t) => [t.id, t]));
  const invoiceMap = new Map<string, (typeof invoiceRows)[number]>(
    invoiceRows.map((i) => [i.id, i]),
  );
  const paymentMap = new Map<string, (typeof paymentRows)[number]>(
    paymentRows.map((p) => [p.id, p]),
  );
  const expenseMap = new Map<string, (typeof expenseRows)[number]>(
    expenseRows.map((e) => [e.id, e]),
  );
  const conversationMap = new Map<string, (typeof conversationRows)[number]>(
    conversationRows.map((c) => [c.id, c]),
  );

  // --- Wave 3: the organisations and people everything above refers to -----
  const senderIds = ids(receivedMessages.map((m) => m.senderId));
  const businessIds = ids(
    memberships.map((m) => m.businessId),
    upgradeRequests.map((r) => r.businessId),
    assignedTasks.map((t) => t.businessId),
    createdTasks.map((t) => t.businessId),
    comments.map((c) => c.businessId),
    mentions.map((m) => m.comment.businessId),
    notifications.map((n) => n.businessId),
    activity.map((a) => a.businessId),
    projectRows.map((p) => p.businessId),
    conversationRows.map((c) => c.businessId),
  );

  const [businessRows, senderRows] = await Promise.all([
    businessIds.length
      ? prisma.business.findMany({
          where: { id: { in: businessIds } },
          select: { id: true, name: true, subscriptionPlan: true, defaultCurrency: true },
        })
      : [],
    senderIds.length
      ? prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [],
  ]);
  const businessMap = new Map<string, (typeof businessRows)[number]>(
    businessRows.map((b) => [b.id, b]),
  );
  const senderMap = new Map<string, (typeof senderRows)[number]>(senderRows.map((s) => [s.id, s]));

  const businessName = (id: string | null | undefined) =>
    (id && businessMap.get(id)?.name) || 'Unknown organisation';
  const projectName = (id: string | null | undefined) => {
    const project = id ? projectMap.get(id) : null;
    if (!project) return 'Deleted or unavailable project';
    return project.displayId ? `${project.title} (${project.displayId})` : project.title;
  };
  /** Turns a polymorphic entityType/entityId pair into something a person can place. */
  const describeEntity = (entityType: string, entityId: string) => {
    switch (entityType) {
      case 'Project':
        return `Project — ${projectName(entityId)}`;
      case 'Task':
        return `Task — ${taskMap.get(entityId)?.title ?? 'deleted task'}`;
      case 'Invoice':
        return `Invoice — ${invoiceMap.get(entityId)?.invoiceNumber ?? 'deleted invoice'}`;
      case 'Payment': {
        const payment = paymentMap.get(entityId);
        if (!payment) return 'Payment — deleted payment';
        const currency =
          payment.invoice?.currency ?? businessMap.get(payment.businessId)?.defaultCurrency ?? 'USD';
        return `Payment of ${fmtMoney(payment.amountCents, currency)}${
          payment.invoice ? ` on invoice ${payment.invoice.invoiceNumber}` : ''
        }`;
      }
      case 'Expense': {
        const expense = expenseMap.get(entityId);
        if (!expense) return 'Expense — deleted expense';
        return `Expense — ${expense.description || expense.category} (${fmtMoney(
          expense.amountCents,
          expense.currency,
        )})`;
      }
      case 'Broadcast':
        return `Announcement in ${conversationName(entityId)}`;
      default:
        return `${entityType} — ${entityId}`;
    }
  };
  const senderName = (senderId: string | null, isGuest: boolean, conversationId: string) => {
    if (senderId) {
      const sender = senderMap.get(senderId);
      if (!sender) return 'A former teammate';
      return [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim() || sender.email;
    }
    if (isGuest) return conversationMap.get(conversationId)?.guestName || 'A guest';
    return 'Unknown sender';
  };
  const conversationName = (id: string) => {
    const convo = conversationMap.get(id);
    if (!convo) return 'Deleted or unavailable conversation';
    const kind = CONVERSATION_TYPES[convo.type] ?? convo.type;
    return convo.title || convo.guestName || kind;
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);

  const sections: ExportSection[] = [
    {
      id: 'profile',
      title: 'Your profile',
      description:
        'The account details you gave us when you signed up, plus the preferences you set inside the app.',
      columns: [
        { key: 'field', label: 'Detail' },
        { key: 'value', label: 'What we hold' },
      ],
      emptyText: 'No profile details on record.',
      rows: [
        { field: 'Account ID', value: user.id },
        { field: 'Email address', value: user.email },
        { field: 'First name', value: fmtText(user.firstName) },
        { field: 'Last name', value: fmtText(user.lastName) },
        { field: 'Profile picture', value: user.imageUrl ? user.imageUrl : 'No picture uploaded' },
        { field: 'Account created', value: fmtDateTime(user.createdAt) },
        { field: 'Profile last updated', value: fmtDateTime(user.updatedAt) },
        { field: 'Free trial used', value: user.hasUsedFreeTrial ? 'Yes' : 'No' },
        {
          field: 'Menu layout you chose',
          value: fmtVisibility(user.navPreferences, 'href', 'menu items'),
        },
        {
          field: 'Quick actions you chose',
          value: fmtVisibility(user.quickActionPreferences, 'id', 'quick actions'),
        },
        { field: 'Notification settings', value: fmtNotificationPrefs(user.notificationPreferences) },
      ],
    },
    {
      id: 'organisations',
      title: 'Organisations you belong to',
      description:
        'The workspaces your account can sign in to, the level of access you have in each, and when you joined.',
      columns: [
        { key: 'organisation', label: 'Organisation' },
        { key: 'role', label: 'Your access level' },
        { key: 'capacity', label: 'Weekly capacity' },
        { key: 'plan', label: 'Their plan' },
        { key: 'joined', label: 'Joined' },
      ],
      emptyText: 'You are not a member of any organisation.',
      rows: memberships.map((m) => ({
        organisation: businessName(m.businessId),
        role: roleLabel(m.role),
        capacity: `${m.weeklyCapacityHours} hours`,
        plan: businessMap.get(m.businessId)?.subscriptionPlan ?? '—',
        joined: fmtDateTime(m.createdAt),
      })),
    },
    {
      id: 'projects',
      title: 'Projects you work on',
      description:
        'Projects where you are the named lead, or where you were added to the team. Deadlines and stages are the current values, not a history.',
      columns: [
        { key: 'project', label: 'Project' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'client', label: 'Client' },
        { key: 'involvement', label: 'Your involvement' },
        { key: 'stage', label: 'Current stage' },
        { key: 'deadline', label: 'Deadline' },
      ],
      emptyText: 'You are not attached to any project.',
      rows: (() => {
        const leadIds = new Set(leadProjects.map((p) => p.id));
        const memberRoles = new Map<string, string>(
          projectMemberships.map((m) => [m.projectId, m.role]),
        );
        const involved = ids(leadProjects.map((p) => p.id), projectMemberships.map((m) => m.projectId));
        return involved.map((id) => {
          const project = projectMap.get(id);
          const parts = [
            leadIds.has(id) ? 'Project lead' : null,
            memberRoles.has(id) ? roleLabel(memberRoles.get(id)!) : null,
          ].filter(Boolean);
          return {
            project: projectName(id),
            organisation: businessName(project?.businessId),
            client: project?.client?.displayName ?? '—',
            involvement: parts.join(' · ') || 'Team member',
            stage: project?.statusStage?.name ?? (project?.isArchived ? 'Archived' : '—'),
            deadline: fmtDate(project?.deadline),
          };
        });
      })(),
    },
    {
      id: 'tasks-assigned',
      title: 'Tasks assigned to you',
      description: 'Pieces of work someone put your name against, including ones already finished.',
      columns: [
        { key: 'task', label: 'Task' },
        { key: 'project', label: 'Project' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'status', label: 'Status' },
        { key: 'due', label: 'Due' },
        { key: 'completed', label: 'Completed' },
        { key: 'details', label: 'Details' },
      ],
      emptyText: 'No tasks are assigned to you.',
      rows: assignedTasks.map((t) => ({
        task: t.title,
        project: projectName(t.projectId),
        organisation: businessName(t.businessId),
        status: statusLabel(t.status),
        due: fmtDate(t.dueDate),
        completed: fmtDateTime(t.completedAt),
        details: fmtText(t.description),
      })),
    },
    {
      id: 'tasks-created',
      title: 'Tasks you created for other people',
      description: 'Work you set up and handed to a teammate. Tasks you created for yourself appear in the list above.',
      columns: [
        { key: 'task', label: 'Task' },
        { key: 'project', label: 'Project' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'status', label: 'Status' },
        { key: 'created', label: 'Created' },
      ],
      emptyText: 'You have not created any tasks for other people.',
      rows: createdTasks.map((t) => ({
        task: t.title,
        project: projectName(t.projectId),
        organisation: businessName(t.businessId),
        status: statusLabel(t.status),
        created: fmtDateTime(t.createdAt),
      })),
    },
    {
      id: 'comments',
      title: 'Comments you wrote',
      description: 'Everything you posted in a discussion thread, including replies and comments you later deleted.',
      columns: [
        { key: 'target', label: 'Posted on' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'body', label: 'What you wrote' },
        { key: 'kind', label: 'Type' },
        { key: 'created', label: 'Posted' },
        { key: 'edited', label: 'Edited' },
        { key: 'deleted', label: 'Deleted' },
      ],
      emptyText: 'You have not written any comments.',
      rows: comments.map((c) => ({
        target: describeEntity(c.entityType, c.entityId),
        organisation: businessName(c.businessId),
        body: c.body,
        kind: c.parentId ? 'Reply' : 'Comment',
        created: fmtDateTime(c.createdAt),
        edited: fmtDateTime(c.editedAt),
        deleted: fmtDateTime(c.deletedAt),
      })),
    },
    {
      id: 'mentions',
      title: 'Times someone mentioned you',
      description: 'Comments where a teammate tagged you with an @mention, and whether you had read it.',
      columns: [
        { key: 'target', label: 'Where' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'body', label: 'The comment' },
        { key: 'read', label: 'You read it' },
        { key: 'created', label: 'Mentioned' },
      ],
      emptyText: 'Nobody has mentioned you.',
      rows: mentions.map((m) => ({
        target: describeEntity(m.comment.entityType, m.comment.entityId),
        organisation: businessName(m.comment.businessId),
        body: m.comment.body,
        read: m.readAt ? fmtDateTime(m.readAt) : 'Not read',
        created: fmtDateTime(m.createdAt),
      })),
    },
    {
      id: 'notes',
      title: 'Notes you wrote',
      description: 'Free-text notes you saved against a project — shot lists, ideas, to-dos and client notes.',
      columns: [
        { key: 'project', label: 'Project' },
        { key: 'kind', label: 'Kind of note' },
        { key: 'content', label: 'Content' },
        { key: 'created', label: 'Written' },
      ],
      emptyText: 'You have not written any notes.',
      rows: notes.map((n) => ({
        project: projectName(n.projectId),
        kind: n.type,
        content: n.content,
        created: fmtDateTime(n.createdAt),
      })),
    },
    {
      id: 'time',
      title: 'Time you logged',
      description:
        'Hours recorded against projects, either typed in by hand or captured with the built-in stopwatch.',
      columns: [
        { key: 'project', label: 'Project' },
        { key: 'duration', label: 'Time logged' },
        { key: 'billable', label: 'Billable' },
        { key: 'source', label: 'Recorded by' },
        { key: 'started', label: 'Started' },
        { key: 'ended', label: 'Ended' },
      ],
      emptyText: 'You have not logged any time.',
      rows: timeEntries.map((t) => ({
        project: projectName(t.projectId),
        duration: `${Math.floor(t.durationMinutes / 60)}h ${t.durationMinutes % 60}m`,
        billable: t.isBillable ? 'Yes' : 'No',
        source: t.source === 'stopwatch' ? 'Stopwatch' : 'Entered manually',
        started: fmtDateTime(t.startedAt),
        ended: fmtDateTime(t.endedAt),
      })),
    },
    {
      id: 'conversations',
      title: 'Conversations you are part of',
      description: 'Chat threads your account has access to, and when you last opened each one.',
      columns: [
        { key: 'conversation', label: 'Conversation' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'kind', label: 'Type' },
        { key: 'muted', label: 'Muted' },
        { key: 'lastRead', label: 'Last opened' },
        { key: 'joined', label: 'Joined' },
        { key: 'left', label: 'Left' },
      ],
      emptyText: 'You are not part of any conversation.',
      rows: chatMemberships.map((c) => {
        const convo = conversationMap.get(c.conversationId);
        return {
          conversation: conversationName(c.conversationId),
          organisation: businessName(convo?.businessId),
          kind: convo ? (CONVERSATION_TYPES[convo.type] ?? convo.type) : '—',
          muted: c.isMuted ? 'Yes' : 'No',
          lastRead: fmtDateTime(c.lastReadAt),
          joined: fmtDateTime(c.joinedAt),
          left: fmtDateTime(c.deletedAt),
        };
      }),
    },
    {
      id: 'messages',
      title: 'Messages you sent',
      description:
        'The full text of every chat message sent from your account, including ones you deleted (deleting hides a message from others, it does not erase it).',
      columns: [
        { key: 'conversation', label: 'Conversation' },
        { key: 'content', label: 'Message' },
        { key: 'sent', label: 'Sent' },
        { key: 'deleted', label: 'Deleted' },
      ],
      emptyText: 'You have not sent any messages.',
      rows: messages.map((m) => ({
        conversation: conversationName(m.conversationId),
        content: m.content,
        sent: fmtDateTime(m.createdAt),
        deleted: fmtDateTime(m.deletedAt),
      })),
    },
    {
      id: 'messages-received',
      title: 'Messages you received',
      description:
        'Messages other people sent to the conversations you are part of. These were written by your teammates and clients, so this section is their words rather than yours. Messages the sender has since deleted are not shown, because the app hides those from you too.',
      columns: [
        { key: 'from', label: 'From' },
        { key: 'conversation', label: 'Conversation' },
        { key: 'content', label: 'Message' },
        { key: 'sent', label: 'Sent' },
      ],
      emptyText: 'You have not received any messages.',
      rows: receivedMessages.map((m) => ({
        from: senderName(m.senderId, m.isGuest, m.conversationId),
        conversation: conversationName(m.conversationId),
        content: m.content,
        sent: fmtDateTime(m.createdAt),
      })),
    },
    {
      id: 'notifications',
      title: 'Notifications sent to you',
      description: 'In-app alerts delivered to your account and whether you opened them.',
      columns: [
        { key: 'title', label: 'Notification' },
        { key: 'message', label: 'Message' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'kind', label: 'Type' },
        { key: 'read', label: 'Read' },
        { key: 'sent', label: 'Sent' },
      ],
      emptyText: 'You have not received any notifications.',
      rows: notifications.map((n) => ({
        title: n.title,
        message: n.message,
        organisation: businessName(n.businessId),
        kind: n.type,
        read: n.isRead ? 'Yes' : 'No',
        sent: fmtDateTime(n.createdAt),
      })),
    },
    {
      id: 'plan-requests',
      title: 'Plan and upgrade requests you made',
      description: 'Requests you sent asking us to move an organisation onto a different subscription plan.',
      columns: [
        { key: 'organisation', label: 'Organisation' },
        { key: 'plan', label: 'Plan requested' },
        { key: 'message', label: 'Your message' },
        { key: 'status', label: 'Outcome' },
        { key: 'requested', label: 'Requested' },
      ],
      emptyText: 'You have not requested a plan change.',
      rows: upgradeRequests.map((r) => ({
        organisation: businessName(r.businessId),
        plan: r.planRequested,
        message: fmtText(r.message),
        status: statusLabel(r.status),
        requested: fmtDateTime(r.createdAt),
      })),
    },
    {
      id: 'activity',
      title: 'Actions recorded against your account',
      description:
        'A log of changes you made to invoices, payments and other records. We keep this so organisations can see who changed what.',
      columns: [
        { key: 'action', label: 'What happened' },
        { key: 'record', label: 'Record' },
        { key: 'organisation', label: 'Organisation' },
        { key: 'when', label: 'When' },
      ],
      emptyText: 'No recorded actions.',
      rows: activity.map((a) => ({
        action: titleCase(a.action.replace(/_/g, ' ').toLowerCase()),
        record: describeEntity(a.entityType, a.entityId),
        organisation: businessName(a.businessId),
        when: fmtDateTime(a.createdAt),
      })),
    },
    {
      id: 'feedback',
      title: 'Feedback and support messages you sent us',
      description:
        'Bug reports, ideas and messages you sent through the in-app feedback box or the website contact form.',
      columns: [
        { key: 'kind', label: 'Kind' },
        { key: 'message', label: 'What you told us' },
        { key: 'page', label: 'Page' },
        { key: 'status', label: 'Status' },
        { key: 'sent', label: 'Sent' },
      ],
      emptyText: 'You have not sent us any feedback.',
      rows: [
        ...productFeedback.map((f) => ({
          kind: `In-app feedback (${f.type})`,
          message: f.message,
          page: fmtText(f.url),
          status: statusLabel(f.status),
          sent: fmtDateTime(f.createdAt),
        })),
        ...contactMessages.map((c) => ({
          kind: `Contact form (${c.source})`,
          message: c.message,
          page: '—',
          status: '—',
          sent: fmtDateTime(c.createdAt),
        })),
      ],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    subject: {
      id: user.id,
      email: user.email,
      name: fullName || user.email,
    },
    summary: [
      { label: 'Organisations', value: String(memberships.length) },
      {
        label: 'Projects',
        value: String(ids(leadProjects.map((p) => p.id), projectMemberships.map((m) => m.projectId)).length),
      },
      { label: 'Tasks assigned', value: String(assignedTasks.length) },
      { label: 'Messages sent', value: String(messages.length) },
      { label: 'Messages received', value: String(receivedMessages.length) },
      { label: 'Comments written', value: String(comments.length) },
      {
        label: 'Time logged',
        value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
      },
      { label: 'Member since', value: fmtDate(user.createdAt) },
    ],
    sections,
  };
}
