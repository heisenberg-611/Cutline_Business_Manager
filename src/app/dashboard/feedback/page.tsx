import { getFeedbackResponses } from '@/modules/feedback/actions'
import { ConvertTestimonialButton } from '@/modules/feedback/components/convert-testimonial-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { DeleteFeedbackButton } from '@/modules/feedback/components/delete-feedback-button'
import { ResolveFeedbackButton } from '@/modules/feedback/components/resolve-feedback-button'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Feedback',
}

export default async function FeedbackInboxPage() {
  const responses = await getFeedbackResponses()

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Feedback Inbox</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link href="/dashboard/feedback/requests" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800">
              View Requests
            </Button>
          </Link>
          <Link href="/dashboard/feedback/testimonials" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              View Testimonials
            </Button>
          </Link>
        </div>
      </div>
      
      {responses.length === 0 ? (
        <div className="text-center text-muted-foreground p-12 border border-dashed rounded-lg">
          No feedback responses yet.
        </div>
      ) : (
        <div className="grid gap-6">
          {responses.map((response) => (
            <Card key={response.id}>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                <div className="space-y-1 w-full">
                  <CardTitle className="text-xl break-words">
                    {response.request.project.title} - {response.request.client.displayName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Overall Score: {response.overallScore} / 10
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {response.consentToPublish && !response.testimonial && (
                    <ConvertTestimonialButton 
                      responseId={response.id} 
                      defaultText={response.commentText || ''} 
                    />
                  )}
                  {response.testimonial && (
                    <Badge variant="secondary">Converted</Badge>
                  )}
                  {response.request.status === 'COMPLETED' && (
                    <ResolveFeedbackButton requestId={response.request.id} />
                  )}
                  {response.request.status === 'RESOLVED' && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">Resolved</Badge>
                  )}
                  <DeleteFeedbackButton responseId={response.id} />
                </div>
              </CardHeader>
              <CardContent>
                {response.dimensionScores && (
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    {Object.entries(response.dimensionScores as Record<string, number>).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-muted-foreground capitalize">{key}</span>
                        <span className="font-medium">{value}/10</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {response.commentText && (
                  <div className="bg-muted p-4 rounded-md text-sm italic mb-4">
                    "{response.commentText}"
                  </div>
                )}

                {response.videoUrl && (
                  <div className="text-sm">
                    <a href={response.videoUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                      View Video Response
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
