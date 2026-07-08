'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Update the business's default currency.
 */
export async function updateBusinessCurrency(currency: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.business.update({
    where: { id: orgId },
    data: { defaultCurrency: currency },
  })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
}

/**
 * Add a new workflow stage to the business's pipeline template.
 */
export async function addWorkflowStage(name: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const template = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: { orderBy: { orderIndex: 'desc' }, take: 1 } },
  })

  if (!template) throw new Error('No workflow template found')

  const nextIndex = (template.stages[0]?.orderIndex ?? -1) + 1

  await prisma.workflowStage.create({
    data: {
      templateId: template.id,
      name,
      orderIndex: nextIndex,
    },
  })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/pipeline')
}

/**
 * Rename an existing workflow stage.
 */
export async function renameWorkflowStage(stageId: string, newName: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Verify stage belongs to this business
  const stage = await prisma.workflowStage.findFirst({
    where: { id: stageId, template: { businessId: orgId } },
  })
  if (!stage) throw new Error('Stage not found')

  await prisma.workflowStage.update({
    where: { id: stageId },
    data: { name: newName },
  })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/pipeline')
}

/**
 * Delete a workflow stage. Projects on this stage will be moved to the first stage.
 */
export async function deleteWorkflowStage(stageId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const stage = await prisma.workflowStage.findFirst({
    where: { id: stageId, template: { businessId: orgId } },
    include: { template: { include: { stages: { orderBy: { orderIndex: 'asc' } } } } },
  })
  if (!stage) throw new Error('Stage not found')

  // Don't allow deleting the last stage
  if (stage.template.stages.length <= 1) {
    throw new Error('Cannot delete the only remaining stage')
  }

  // Move projects on this stage to the first available stage
  const fallbackStage = stage.template.stages.find((s) => s.id !== stageId)
  if (fallbackStage) {
    await prisma.project.updateMany({
      where: { statusStageId: stageId },
      data: { statusStageId: fallbackStage.id },
    })
  }

  await prisma.workflowStage.delete({ where: { id: stageId } })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/pipeline')
}
