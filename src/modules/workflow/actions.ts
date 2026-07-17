'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/lib/onesignal'

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
    console.warn(`Business ${orgId} not found. Creating it now.`)
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
  const { orgId, userId, orgRole } = await auth()
  
  if (!orgId || !userId) {
    throw new Error('Unauthorized')
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })

  if (!project || project.businessId !== orgId) {
    throw new Error('Project not found or unauthorized')
  }

  if (orgRole !== 'org:admin' && project.assigneeId !== userId) {
    throw new Error('Forbidden: You are not assigned to this project.')
  }

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
      })
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
          await prisma.notification.createMany({
            data: admins.map(admin => ({
              businessId: orgId,
              userId: admin.userId,
              title: 'Project Ready for Review',
              message: `Project "${project.title}" is ready for review by ${memberName}.`,
              type: 'project',
              actionUrl: `/dashboard/projects/${projectId}`
            }))
          })

          await sendPushNotification(
            'Project Ready for Review',
            `Project "${project.title}" is ready for review by ${memberName}.`,
            admins.map(a => a.userId),
            `/dashboard/projects/${projectId}`
          ).catch(console.error)
        }
      }
    }
  }

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/projects')
  }
}

export async function updateProjectOrder(updates: { id: string, statusStageId: string, orderIndex: number }[]) {
  const { orgId, userId, orgRole } = await auth()
  
  if (!orgId || !userId) {
    throw new Error('Unauthorized')
  }

  if (orgRole !== 'org:admin') {
    const projectIds = updates.map(u => u.id)
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds }, businessId: orgId }
    })
    for (const project of projects) {
      if (project.assigneeId !== userId) {
        throw new Error(`Forbidden: You are not assigned to this project.`)
      }
    }
  }

  // Update all projects in a transaction
  await prisma.$transaction(
    updates.map((update) => 
      prisma.project.update({
        where: { id: update.id, businessId: orgId },
        data: {
          statusStageId: update.statusStageId,
          orderIndex: update.orderIndex
        }
      })
    )
  )

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
              await prisma.notification.createMany({
                data: admins.map(admin => ({
                  businessId: orgId,
                  userId: admin.userId,
                  title: 'Project Ready for Review',
                  message: `Project "${project.title}" is ready for review by ${memberName}.`,
                  type: 'project',
                  actionUrl: `/dashboard/projects/${project.id}`
                }))
              })

              await sendPushNotification(
                'Project Ready for Review',
                `Project "${project.title}" is ready for review by ${memberName}.`,
                admins.map(a => a.userId),
                `/dashboard/projects/${project.id}`
              ).catch(console.error)
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
  const { orgId, userId, orgRole } = await auth()
  
  if (!orgId || !userId) {
    throw new Error('Unauthorized')
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })

  if (!project) {
    throw new Error('Project not found')
  }

  // Only the assigned member or an admin can submit
  if (orgRole !== 'org:admin' && project.assigneeId !== userId) {
    throw new Error('Forbidden: You are not assigned to this project.')
  }

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
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            businessId: orgId,
            userId: admin.userId,
            title: 'Delivery Link Submitted',
            message: `${memberName} has attached a delivery link for "${project.title}".`,
            type: 'project',
            actionUrl: `/dashboard/projects/${project.id}`
          }))
        })

        await sendPushNotification(
          'Delivery Link Submitted',
          `${memberName} has attached a delivery link for "${project.title}".`,
          admins.map(a => a.userId),
          `/dashboard/projects/${project.id}`
        ).catch(console.error)
      }
    }
  }

  revalidatePath(`/dashboard/projects/${projectId}`)
}
