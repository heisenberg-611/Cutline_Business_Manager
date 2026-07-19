import { getFeedbackRequests } from '@/modules/feedback/actions'
import { getProjects } from '@/modules/projects/actions'
import { auth } from '@clerk/nextjs/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { DeleteFeedbackRequestButton } from '@/modules/feedback/components/delete-feedback-request-button'
import { ResendFeedbackEmailButton } from '@/modules/feedback/components/resend-feedback-email-button'
import { CreateFeedbackRequestDialog } from '@/modules/feedback/components/create-feedback-request-dialog'
import { CopyableLink } from '@/modules/feedback/components/copyable-link'
import { getAppUrl } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Feedback Requests',
}

export default async function FeedbackRequestsPage() {
  const { orgId } = await auth()
  
  const [requests, projects] = await Promise.all([
    getFeedbackRequests(),
    orgId ? getProjects(orgId) : Promise.resolve([])
  ])

  const appUrl = getAppUrl()

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Feedback Requests</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link href="/dashboard/feedback" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800">
              &larr; Back to Inbox
            </Button>
          </Link>
          <div className="w-full sm:w-auto">
            <CreateFeedbackRequestDialog projects={projects} />
          </div>
        </div>
      </div>
      
      {requests.length === 0 ? (
        <div className="text-center text-muted-foreground p-12 border border-dashed rounded-lg">
          No feedback requests found. Generate one to get started!
        </div>
      ) : (
        <div className="grid gap-6">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                <div className="space-y-1 w-full">
                  <CardTitle className="text-xl break-words">
                    {request.project.title} - {request.client.displayName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Sent on {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Badge 
                    variant={
                      request.status === 'COMPLETED' ? 'default' : 
                      request.status === 'RESOLVED' ? 'outline' : 'secondary'
                    }
                  >
                    {request.status}
                  </Badge>
                  {request.status === 'PENDING' && (
                    <ResendFeedbackEmailButton projectId={request.projectId} token={request.token} />
                  )}
                  <DeleteFeedbackRequestButton requestId={request.id} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium mb-1">Feedback Link</div>
                <CopyableLink url={`${appUrl}/feedback/${request.token}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
