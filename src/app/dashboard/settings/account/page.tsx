import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SettingsSection } from '@/modules/settings/components/ui'
import { classifyDeletion } from '@/lib/account-deletion'
import { getMyDeletionRequest } from './actions'
import { DeletionFlow } from './components/DeletionFlow'

export const metadata = {
  title: 'Account',
}

export default async function AccountSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/dashboard/select-business')

  // Both resolved on the server: the scope decides what the user is warned
  // about, and the request decides which step of the flow they are on.
  const [scope, request] = await Promise.all([
    classifyDeletion(userId),
    getMyDeletionRequest(),
  ])

  return (
    <div className="space-y-10">
      <SettingsSection
        title="Delete account"
        description="Request your data, then permanently close your account"
      >
        <div className="p-6">
          <DeletionFlow
            scope={scope}
            request={
              request
                ? {
                    status: request.status,
                    requestedAt: request.requestedAt.toISOString(),
                    dataDeliveredAt: request.dataDeliveredAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </div>
      </SettingsSection>
    </div>
  )
}
