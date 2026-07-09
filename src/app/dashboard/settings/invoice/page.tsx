import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { InvoiceSettingsForm } from '@/modules/settings/components/InvoiceSettingsForm'

export default async function InvoiceSettingsPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const business = await prisma.business.findUnique({
    where: { id: orgId },
  })

  if (!business) {
    redirect('/dashboard/select-business')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
          Invoice & Email Settings
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Manage how your invoices are numbered and customize the email template sent to clients.
        </p>
      </div>
      
      <InvoiceSettingsForm business={business} />
    </div>
  )
}
