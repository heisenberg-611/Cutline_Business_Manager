import { getFeedbackResponses } from '@/modules/feedback/actions'
import { ConvertTestimonialButton } from '@/modules/feedback/components/convert-testimonial-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { DeleteFeedbackButton } from '@/modules/feedback/components/delete-feedback-button'
import { ResolveFeedbackButton } from '@/modules/feedback/components/resolve-feedback-button'

export const metadata = {
  title: 'Feedback',
}

export default async function FeedbackInboxPage() {
  const responses = await getFeedbackResponses()

  return (
    <div className="p-8 w-full mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Feedback Inbox</h1>
        <Link href="/dashboard/feedback/testimonials" className="text-sm font-medium hover:underline">
          View Testimonials &rarr;
        </Link>
      </div>
      
      {responses.length === 0 ? (
        <div className="text-center text-muted-foreground p-12 border border-dashed rounded-lg">
          No feedback responses yet.
        </div>
      ) : (
        <div className="grid gap-6">
          {responses.map((response) => (
            <Card key={response.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    {response.request.project.title} - {response.request.client.displayName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Overall Score: {response.overallScore} / 10
                  </p>
                </div>
                <div className="flex items-center space-x-2">
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
                  <div className="flex gap-4 mb-4 text-sm">
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
