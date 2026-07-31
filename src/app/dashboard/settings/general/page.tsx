import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { SettingsSection, SettingsRow } from '@/modules/settings/components/ui'
import { BusinessNameEditor } from '@/modules/settings/components/BusinessNameEditor'
import { CurrencySelector } from '@/modules/settings/components/CurrencySelector'

export const metadata = {
  title: 'General Settings',
}

export default async function GeneralSettingsPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/dashboard/select-business')

  const business = await prisma.business.findUnique({ 
    where: { id: orgId },
    select: { name: true, defaultCurrency: true }
  })
  if (!business) redirect('/dashboard/select-business')

  return (
    <div className="space-y-10">
      <SettingsSection title="Business Profile" description="Your studio identity and branding">
        <SettingsRow
          label="Business name"
          description="This is your official Clerk Organization name. Updating it syncs across the platform, invoices, and emails."
        >
          <BusinessNameEditor currentName={business.name} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Regional" description="Defaults used across invoices and financial reports">
        <SettingsRow label="Default currency" description="Applied to new invoices, expenses, and dashboards.">
          <CurrencySelector currentCurrency={business.defaultCurrency} />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}
