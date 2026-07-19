import { getTestimonials } from '@/modules/feedback/actions'
import { TogglePublishButton } from '@/modules/feedback/components/toggle-publish-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Testimonials',
}

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials()

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Link href="/dashboard/feedback" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800">
              &larr; Back to Inbox
            </Button>
          </Link>
        </div>
      </div>
      
      {testimonials.length === 0 ? (
        <div className="text-center text-muted-foreground p-12 border border-dashed rounded-lg">
          No testimonials yet. Convert them from the feedback inbox.
        </div>
      ) : (
        <div className="grid gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id}>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                <div className="space-y-1 w-full">
                  <CardTitle className="text-xl break-words">
                    {testimonial.project?.title || 'Unknown Project'} - {testimonial.client?.displayName || 'Unknown Client'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    From Feedback Score: {testimonial.feedbackResponse?.overallScore ?? 'N/A'} / 10
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Badge variant={testimonial.isPublished ? 'default' : 'secondary'}>
                    {testimonial.isPublished ? 'Published' : 'Hidden'}
                  </Badge>
                  <TogglePublishButton 
                    testimonialId={testimonial.id} 
                    isPublished={testimonial.isPublished} 
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md text-sm mb-4">
                  {testimonial.displayText}
                </div>

                {testimonial.videoRef && (
                  <div className="text-sm">
                    <a href={testimonial.videoRef} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                      View Video Testimonial
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
