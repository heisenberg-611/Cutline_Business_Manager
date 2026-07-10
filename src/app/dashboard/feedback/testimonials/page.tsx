import { getTestimonials } from '@/modules/feedback/actions'
import { TogglePublishButton } from '@/modules/feedback/components/toggle-publish-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export const metadata = {
  title: 'Testimonials',
}

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials()

  return (
    <div className="p-8 w-full mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
        <Link href="/dashboard/feedback" className="text-sm font-medium hover:underline">
          &larr; Back to Inbox
        </Link>
      </div>
      
      {testimonials.length === 0 ? (
        <div className="text-center text-muted-foreground p-12 border border-dashed rounded-lg">
          No testimonials yet. Convert them from the feedback inbox.
        </div>
      ) : (
        <div className="grid gap-6">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    {testimonial.project.title} - {testimonial.client.displayName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    From Feedback Score: {testimonial.feedbackResponse.overallScore} / 10
                  </p>
                </div>
                <div className="flex items-center space-x-2">
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
