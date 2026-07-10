import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ProdPTabsWrapper as ProdPTabs } from '@/modules/prodp/components/ProdPTabsWrapper'
import prisma from '@/modules/core/db/prisma'

export const metadata = {
  title: 'Production',
}

export default async function ProdPPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const activeProjects = await prisma.project.findMany({
    where: { businessId: orgId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    include: { client: true }
  })

  const reviewRequests = await prisma.reviewRequest.findMany({
    where: { businessId: orgId },
    orderBy: { createdAt: 'desc' },
    include: { project: true, client: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Production Hub (ProdP)
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your Pre-Production (Intake) and Post-Production (Review) workflows.
          </p>
        </div>
      </div>
      
      <ProdPTabs 
        businessId={orgId} 
        activeProjects={activeProjects as any} 
        reviewRequests={reviewRequests as any}
      />
    </div>
  )
}
