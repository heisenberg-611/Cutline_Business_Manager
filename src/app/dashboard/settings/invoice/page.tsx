import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { InvoiceSettingsForm } from '@/modules/settings/components/InvoiceSettingsForm'

export const metadata = {
  title: 'Invoice Settings',
}

export default async function InvoiceSettingsPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { 
      name: true,
      invoicePrefix: true, 
      invoiceSeparator: true, 
      invoiceSequence: true,
      emailSubjectTemplate: true, 
      emailBodyTemplate: true, 
      paymentInstructions: true, 
      feedbackEmailSubjectTemplate: true, 
      feedbackEmailBodyTemplate: true 
    }
  })

  if (!business) {
    redirect('/dashboard/select-business')
  }

  return <InvoiceSettingsForm business={business} />
}
