'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { createManyNotifications } from '@/modules/notifications/services'
import { authorizeProjectAccess, authorizeProjectsAccess } from '@/modules/projects/authz'
import * as Ably from 'ably'
import { pipelineChannel, PIPELINE_EVENT, type ProjectsMovedPayload } from '@/lib/ably/channels'

/**
 * Fans a board change out to everyone else viewing the pipeline.
 *
 * Best-effort: a realtime failure must not fail the write that already
 * succeeded. Clients still reconcile on their next fetch.
 */
async function publishPipelineUpdate(
  orgId: string,
  actorUserId: string,
  updates: ProjectsMovedPayload['updates']
) {
  if (!process.env.ABLY_API_KEY) return

  try {
    const ably = new Ably.Rest(process.env.ABLY_API_KEY)
    const payload: ProjectsMovedPayload = { actorUserId, updates }
    await ably.channels.get(pipelineChannel(orgId)).publish(PIPELINE_EVENT.projectsMoved, payload)
  } catch (e) {
    console.error('Ably pipeline publish error:', e)
  }
}

const DEFAULT_STAGES = [
  { name: 'Idea / Discovery', orderIndex: 0 },
  { name: 'Planning & Prep', orderIndex: 1 },
  { name: 'Drafting / Execution', orderIndex: 2 },
  { name: 'Internal Review', orderIndex: 3 },
  { name: 'Refinement', orderIndex: 4 },
  { name: 'Client Feedback', orderIndex: 5 },
  { name: 'Final Polish', orderIndex: 6 },
  { name: 'Delivered', orderIndex: 7 }
]

export async function ensureDefaultTemplate(orgId: string) {
  const { orgId: userOrgId } = await auth()
  if (!userOrgId || userOrgId !== orgId) throw new Error('Unauthorized')
  if (!orgId) return null

  // Check if business exists
  const business = await prisma.business.findUnique({
    where: { id: orgId }
  })

  if (!business) {
    console.warn('Business %s not found. Creating it now.', orgId)
    // Create business if it doesn't exist (synced from Clerk webhook)
    await prisma.business.create({
      data: {
        id: orgId,
        name: `Business ${orgId}`,
        defaultCurrency: 'USD'
      }
    })
  }

  // Check if any template exists for this org
  const existing = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: { orderBy: { orderIndex: 'asc' } } }
  })

  if (existing) {
    return existing
  }

  // Create default template
  const template = await prisma.workflowTemplate.create({
    data: {
      businessId: orgId,
      name: 'Standard Creative Workflow',
      projectType: 'General',
      stages: {
        create: DEFAULT_STAGES
      }
    },
    include: {
      stages: {
        orderBy: { orderIndex: 'asc' }
      }
    }
  })

  // Assign any existing projects without a stage to the first stage
  const firstStage = template.stages[0]
  if (firstStage) {
    await prisma.project.updateMany({
      where: {
        businessId: orgId,
        statusStageId: null
      },
      data: {
        statusStageId: firstStage.id
      }
    })
  }

  return template
}

export async function updateProjectStage(projectId: string, newStageId: string) {
  const { orgId, userId, orgRole, project } = await authorizeProjectAccess(projectId, 'write')

  const currentStageId = project.statusStageId

  // Only update if stage changed
  if (currentStageId !== newStageId) {
    await prisma.$transaction([
      // Close previous history record if exists
      ...(currentStageId ? [
        prisma.projectStageHistory.updateMany({
          where: {
            projectId,
            stageId: currentStageId,
            exitedAt: null
          },
          data: {
            exitedAt: new Date()
          }
        })
      ] : []),
      // Update project
      prisma.project.update({
        where: { id: projectId, businessId: orgId },
        data: { statusStageId: newStageId }
      }),
      // Create new history record
      prisma.projectStageHistory.create({
        data: {
          projectId,
          stageId: newStageId
        }
      }),
      // Same trail as the drag path, so the activity feed does not depend on
      // which control was used to move the project.
      prisma.auditLog.create({
        data: {
          businessId: orgId,
          entityType: 'Project',
          entityId: projectId,
          action: 'STAGE_CHANGED',
          actorUserId: userId,
          metadataJson: JSON.stringify({
            fromStageId: currentStageId,
            toStageId: newStageId
          })
        }
      })
    ])

    await publishPipelineUpdate(orgId, userId, [
      { id: projectId, statusStageId: newStageId, orderIndex: project.orderIndex }
    ])

    const newStage = await prisma.workflowStage.findUnique({
      where: { id: newStageId },
      include: { template: { include: { stages: true } } }
    })
    
    if (newStage) {
      const isTerminal = newStage.orderIndex === Math.max(...newStage.template.stages.map(s => s.orderIndex))
      const isDelivery = newStage.name.toLowerCase().includes('deliver')
      
      if (isTerminal && isDelivery) {
        await prisma.auditLog.create({
          data: {
            businessId: orgId,
            entityType: 'Project',
            entityId: projectId,
            action: 'STAGE_CHANGED_TO_DELIVERED',
            actorUserId: userId,
            metadataJson: JSON.stringify({ previousStageId: currentStageId })
          }
        })

        if (orgRole !== 'org:admin') {
          const admins = await prisma.businessMembership.findMany({
            where: { businessId: orgId, role: 'org:admin' }
          })
        const member = await prisma.user.findUnique({ where: { id: userId } })
        const memberName = member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email : 'A team member'
        
        if (admins.length > 0) {
          await createManyNotifications(
            admins.map(a => a.userId),
            {
              businessId: orgId,
              title: 'Project Ready for Review',
              message: `Project "${project.title}" is ready for review by ${memberName}.`,
              type: 'project',
              actionUrl: `/dashboard/projects/${projectId}`
            }
          )
        }
      }
    }
  }

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/projects')
  }
}

/**
 * Persists a board drag.
 *
 * `moved` carries the dragged project's id and the `updatedAt` the client had
 * when the drag started. Only that project is guarded: its stage change is the
 * meaningful edit, while the sibling rows are being reindexed and their order is
 * cosmetic. Guarding every row would make an unrelated concurrent edit anywhere
 * on the board fail the whole drag.
 */
export async function updateProjectOrder(
  updates: { id: string, statusStageId: string, orderIndex: number }[],
  moved?: { id: string, expectedUpdatedAt: Date | string }
) {
  const { orgId, userId, orgRole } = await authorizeProjectsAccess(
    updates.map(u => u.id),
    'write'
  )

  // Stage history is keyed off what actually changed, so the previous stage has
  // to be read before the write.
  const before = await prisma.project.findMany({
    where: { id: { in: updates.map(u => u.id) }, businessId: orgId },
    select: { id: true, statusStageId: true }
  })
  const previousStageById = new Map(before.map(p => [p.id, p.statusStageId]))

  const stageChanges = updates.filter(
    u => previousStageById.get(u.id) !== u.statusStageId
  )

  const now = new Date()

  // Update all projects in a transaction
  try {
    await prisma.$transaction([
      ...updates.map((update) =>
        prisma.project.update({
          where: {
            id: update.id,
            businessId: orgId,
            // Optimistic concurrency: no row matches if someone else has moved
            // this project since the drag began, so the transaction aborts
            // instead of silently overwriting their change.
            ...(moved && moved.id === update.id
              ? { updatedAt: new Date(moved.expectedUpdatedAt) }
              : {})
          },
          data: {
            statusStageId: update.statusStageId,
            orderIndex: update.orderIndex
          }
        })
      ),

      // A drag changes stage exactly like the dropdown does, so it has to leave
      // the same trail. Without this, `stageHistory[0]` is missing and the
      // at-risk checks in financials/dashboard-queries.ts and the nightly
      // analytics snapshot silently skip the project instead of measuring it.
      ...stageChanges.flatMap((change) => {
        const previousStageId = previousStageById.get(change.id) ?? null
        return [
          ...(previousStageId
            ? [
                prisma.projectStageHistory.updateMany({
                  where: { projectId: change.id, stageId: previousStageId, exitedAt: null },
                  data: { exitedAt: now }
                })
              ]
            : []),
          prisma.projectStageHistory.create({
            data: { projectId: change.id, stageId: change.statusStageId, enteredAt: now }
          }),
          prisma.auditLog.create({
            data: {
              businessId: orgId,
              entityType: 'Project',
              entityId: change.id,
              action: 'STAGE_CHANGED',
              actorUserId: userId,
              metadataJson: JSON.stringify({
                fromStageId: previousStageId,
                toStageId: change.statusStageId
              })
            }
          })
        ]
      })
    ])
  } catch (error) {
    // P2025 = "record to update not found", which here means the updatedAt
    // precondition did not match: someone else moved it first.
    if ((error as { code?: string })?.code === 'P2025') {
      throw new Error('CONFLICT: This project was moved by someone else. Refreshing.')
    }
    throw error
  }

  await publishPipelineUpdate(orgId, userId, updates)

  // Check if any moved to terminal delivery stage
  for (const update of updates) {
    const newStage = await prisma.workflowStage.findUnique({
      where: { id: update.statusStageId },
      include: { template: { include: { stages: true } } }
    })
    if (newStage) {
      const isTerminal = newStage.orderIndex === Math.max(...newStage.template.stages.map(s => s.orderIndex))
      const isDelivery = newStage.name.toLowerCase().includes('deliver')
      if (isTerminal && isDelivery) {
        await prisma.auditLog.create({
          data: {
            businessId: orgId,
            entityType: 'Project',
            entityId: update.id,
            action: 'STAGE_CHANGED_TO_DELIVERED',
            actorUserId: userId,
            metadataJson: JSON.stringify({})
          }
        })
        
        if (orgRole !== 'org:admin') {
          const project = await prisma.project.findUnique({ where: { id: update.id } })
          if (project) {
            const admins = await prisma.businessMembership.findMany({
              where: { businessId: orgId, role: 'org:admin' }
            })
            const member = await prisma.user.findUnique({ where: { id: userId } })
            const memberName = member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email : 'A team member'
            
            if (admins.length > 0) {
              await createManyNotifications(
                admins.map(a => a.userId),
                {
                  businessId: orgId,
                  title: 'Project Ready for Review',
                  message: `Project "${project.title}" is ready for review by ${memberName}.`,
                  type: 'project',
                  actionUrl: `/dashboard/projects/${project.id}`
                }
              )
            }
          }
        }
      }
    }
  }

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/projects')
}

export async function submitMemberDelivery(projectId: string, driveLink: string) {
  // Only a project member (or an admin) can submit a delivery.
  const { orgId, userId, orgRole, project } = await authorizeProjectAccess(projectId, 'write')

  if (driveLink && driveLink.trim() !== '') {
    // Add it to the Project Links
    await prisma.projectLink.create({
      data: {
        projectId,
        label: 'Final Delivery Drive Folder',
        url: driveLink.trim()
      }
    })

    // Optionally notify admins again specifically about the link
    if (orgRole !== 'org:admin') {
      const admins = await prisma.businessMembership.findMany({
        where: { businessId: orgId, role: 'org:admin' }
      })
      const member = await prisma.user.findUnique({ where: { id: userId } })
      const memberName = member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email : 'A team member'
      
      if (admins.length > 0) {
        await createManyNotifications(
          admins.map(a => a.userId),
          {
            businessId: orgId,
            title: 'Delivery Link Submitted',
            message: `${memberName} has attached a delivery link for "${project.title}".`,
            type: 'project',
            actionUrl: `/dashboard/projects/${project.id}`
          }
        )
      }
    }
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
}
