'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'

// -----------------------------------------------------------------------------
// DUPLICATE CHECK QUERIES (for live form validation)
// -----------------------------------------------------------------------------

export async function checkAssetDuplicate(name: string, type: string, excludeAssetId?: string): Promise<{ exists: boolean; assetName?: string }> {
  const { orgId } = await auth()
  if (!orgId || !name || !type) return { exists: false }

  const existing = await prisma.asset.findFirst({
    where: {
      businessId: orgId,
      name: { equals: name.trim(), mode: 'insensitive' },
      type,
      ...(excludeAssetId ? { id: { not: excludeAssetId } } : {})
    },
    select: { name: true }
  })

  return existing ? { exists: true, assetName: existing.name } : { exists: false }
}

// -----------------------------------------------------------------------------
// MUTATIONS
// -----------------------------------------------------------------------------

export async function createAsset(data: { type: string, name: string, vendor: string | null, licenseType: string | null, expiresAt: Date | null, cost: number }) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Duplicate check
  const { exists } = await checkAssetDuplicate(data.name, data.type)
  if (exists) {
    throw new Error(`An asset named "${data.name}" of type "${data.type}" already exists. Please use a different name.`)
  }

  await prisma.asset.create({
    data: {
      ...data,
      businessId: orgId
    }
  })

  revalidatePath('/dashboard/assets')
}

export async function updateAsset(assetId: string, data: { type: string, name: string, vendor: string | null, licenseType: string | null, expiresAt: Date | null, cost: number }) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, businessId: orgId }
  })
  if (!asset) throw new Error('Asset not found')

  await prisma.asset.update({
    where: { id: assetId },
    data
  })

  revalidatePath('/dashboard/assets')
}

export async function deleteAsset(assetId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, businessId: orgId }
  })
  if (!asset) throw new Error('Asset not found')

  await prisma.asset.deleteMany({
    where: { id: assetId }
  })

  revalidatePath('/dashboard/assets')
}

export async function getAssets(orgId: string) {
  if (!orgId) return []

  return await prisma.asset.findMany({
    where: { businessId: orgId },
    include: {
      projects: {
        include: {
          project: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

// Linking Actions

export async function linkAssetToProject(projectId: string, assetId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Verify access
  const project = await prisma.project.findFirst({ where: { id: projectId, businessId: orgId } })
  const asset = await prisma.asset.findFirst({ where: { id: assetId, businessId: orgId } })
  
  if (!project || !asset) throw new Error('Not found')

  await prisma.projectAsset.create({
    data: { projectId, assetId }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/assets')
}

export async function unlinkAssetFromProject(projectId: string, assetId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({ where: { id: projectId, businessId: orgId } })
  if (!project) throw new Error('Project not found')

  await prisma.projectAsset.deleteMany({
    where: {
      projectId_assetId: { projectId, assetId }
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath('/dashboard/assets')
}
