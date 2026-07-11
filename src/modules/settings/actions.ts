'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { WORKFLOW_PRESETS } from './config/presets'
import { ALL_NAV_ITEMS } from '@/modules/core/ui/navigation'

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
 * Synchronously update the business name in our DB.
 * Normally Clerk webhooks handle this, but this guarantees immediate UI updates locally.
 */
export async function syncBusinessName(name: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.business.update({
    where: { id: orgId },
    data: { name },
  })

  revalidatePath('/dashboard', 'layout')
}

/**
 * Update the business's invoice and email settings.
 */
export async function updateInvoiceSettings(data: {
  invoicePrefix: string
  invoiceSeparator: string
  emailSubjectTemplate: string
  emailBodyTemplate: string
  paymentInstructions: string
  feedbackEmailSubjectTemplate: string
  feedbackEmailBodyTemplate: string
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.business.update({
    where: { id: orgId },
    data,
  })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/settings/invoice')
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

  await prisma.workflowStage.deleteMany({ where: { id: stageId } })

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/pipeline')
}

/**
 * Reorder workflow stages.
 */
export async function reorderWorkflowStages(stageIds: string[]) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Verify all stages belong to this business's template
  const template = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: true },
  })

  if (!template) throw new Error('Template not found')

  const validStageIds = new Set(template.stages.map(s => s.id))
  if (stageIds.some(id => !validStageIds.has(id))) {
    throw new Error('Invalid stage IDs provided')
  }

  // Update order in a transaction
  await prisma.$transaction(
    stageIds.map((id, index) => 
      prisma.workflowStage.update({
        where: { id },
        data: { orderIndex: index },
      })
    )
  )

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/pipeline')
}

/**
 * Update the user's navigation preferences.
 */
export async function updateNavPreferences(preferences: { href: string; visible: boolean }[]) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await prisma.user.update({
    where: { id: userId },
    data: { navPreferences: preferences },
  })

  revalidatePath('/dashboard', 'layout')
}

/**
 * Apply a complete workflow preset (Navigation + Pipeline Stages).
 */
export async function applyWorkflowPreset(presetId: string) {
  const { orgId, userId } = await auth()
  if (!orgId || !userId) throw new Error('Unauthorized')

  const preset = WORKFLOW_PRESETS.find(p => p.id === presetId)
  if (!preset) throw new Error('Preset not found')

  // 1. Update User Nav Preferences
  await prisma.user.update({
    where: { id: userId },
    data: { navPreferences: preset.navPreferences },
  })

  // 2. Fetch Business Workflow Template
  const template = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: true },
  })

  if (!template) throw new Error('Workflow template not found')

  // 3. Create new stages
  const newStages = await Promise.all(
    preset.pipelineStages.map((name, index) =>
      prisma.workflowStage.create({
        data: {
          templateId: template.id,
          name,
          orderIndex: index,
        },
      })
    )
  )

  const firstNewStage = newStages[0]

  // 4. Update existing projects to the first new stage
  const oldStageIds = template.stages.map(s => s.id)
  
  if (oldStageIds.length > 0) {
    await prisma.project.updateMany({
      where: {
        statusStageId: { in: oldStageIds },
      },
      data: {
        statusStageId: firstNewStage.id,
      },
    })

    // 5. Delete old stages
    await prisma.workflowStage.deleteMany({
      where: {
        id: { in: oldStageIds },
      },
    })
  }

  // 6. Revalidate UI
  revalidatePath('/dashboard', 'layout')
}

/**
 * Restore user navigation and business pipeline back to their defaults.
 */
export async function restoreDefaults() {
  const { orgId, userId } = await auth()
  if (!orgId || !userId) throw new Error('Unauthorized')

  // 1. Reset Nav Preferences
  const defaultNavPrefs = ALL_NAV_ITEMS.map(item => ({ href: item.href, visible: true }))
  await prisma.user.update({
    where: { id: userId },
    data: { navPreferences: defaultNavPrefs },
  })

  // 2. Fetch Template
  const template = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: true },
  })

  if (!template) throw new Error('Workflow template not found')

  // 3. Create Default Stages
  const newStages = await Promise.all(
    DEFAULT_STAGES.map((stage) =>
      prisma.workflowStage.create({
        data: {
          templateId: template.id,
          name: stage.name,
          orderIndex: stage.orderIndex,
        },
      })
    )
  )

  const firstNewStage = newStages[0]

  // 4. Migrate projects and delete old stages
  const oldStageIds = template.stages.map(s => s.id)
  
  if (oldStageIds.length > 0) {
    await prisma.project.updateMany({
      where: { statusStageId: { in: oldStageIds } },
      data: { statusStageId: firstNewStage.id },
    })

    await prisma.workflowStage.deleteMany({
      where: { id: { in: oldStageIds } },
    })
  }

  revalidatePath('/dashboard', 'layout')
}
