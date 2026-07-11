'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'

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
  const { orgId } = await auth()
  
  if (!orgId) {
    throw new Error('Unauthorized')
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  })

  if (!project || project.businessId !== orgId) {
    throw new Error('Project not found or unauthorized')
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
        where: { id: projectId },
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

    revalidatePath('/dashboard/pipeline')
    revalidatePath('/dashboard/projects')
  }
}

export async function updateProjectOrder(updates: { id: string, statusStageId: string, orderIndex: number }[]) {
  const { orgId } = await auth()
  
  if (!orgId) {
    throw new Error('Unauthorized')
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

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard/projects')
}
