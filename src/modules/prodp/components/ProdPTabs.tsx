'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createReviewRequest, deleteReviewRequest, resolveReviewRequest } from '../actions'
import { getAppUrl } from '@/lib/utils'
import { Copy, ExternalLink, Check, Trash2 } from 'lucide-react'

export function ProdPTabs({ businessId, activeProjects, reviewRequests }: { businessId: string, activeProjects: any[], reviewRequests: any[] }) {
  const [copiedIntake, setCopiedIntake] = useState(false)
  const intakeUrl = `${getAppUrl()}/intake/${businessId}`

  const copyIntakeUrl = () => {
    navigator.clipboard.writeText(intakeUrl)
    setCopiedIntake(true)
    setTimeout(() => setCopiedIntake(false), 2000)
  }

  // Review Form State
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [draftLink, setDraftLink] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReviewToken, setGeneratedReviewToken] = useState<string | null>(null)
  const [copiedReview, setCopiedReview] = useState(false)

  const handleGenerateReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId) return
    setIsGenerating(true)
    try {
      const req = await createReviewRequest(selectedProjectId, draftLink)
      setGeneratedReviewToken(req.token)
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyReviewUrl = () => {
    if (!generatedReviewToken) return
    navigator.clipboard.writeText(`${getAppUrl()}/review/${generatedReviewToken}`)
    setCopiedReview(true)
    setTimeout(() => setCopiedReview(false), 2000)
  }

  const handleDeleteReviewRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review request?')) return
    try {
      await deleteReviewRequest(id)
    } catch (err) {
      console.error(err)
      alert('Failed to delete review request')
    }
  }

  const handleResolveReviewRequest = async (id: string) => {
    try {
      await resolveReviewRequest(id)
    } catch (err) {
      console.error(err)
      alert('Failed to resolve review request')
    }
  }

  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null)
  const handleCopyRequestLink = (token: string, id: string) => {
    navigator.clipboard.writeText(`${getAppUrl()}/review/${token}`)
    setCopiedRequestId(id)
    setTimeout(() => setCopiedRequestId(null), 2000)
  }

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cutline_prodp_tab') || 'preprod'
    }
    return 'preprod'
  })

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    localStorage.setItem('cutline_prodp_tab', value)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4 flex w-full md:inline-flex md:w-fit">
        <TabsTrigger value="preprod" className="text-xs sm:text-sm">Pre-Production</TabsTrigger>
        <TabsTrigger value="postprod" className="text-xs sm:text-sm">Post-Production</TabsTrigger>
      </TabsList>

      <TabsContent value="preprod" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Client Intake Link</CardTitle>
            <CardDescription>
              Share this link with prospective clients so they can submit their project brief and assets automatically into your pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 max-w-2xl">
              <Input readOnly value={intakeUrl} className="bg-zinc-50 dark:bg-zinc-900 font-mono text-sm" />
              <Button onClick={copyIntakeUrl} variant="outline" className="w-24 shrink-0">
                {copiedIntake ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copiedIntake ? 'Copied!' : 'Copy'}
              </Button>
              <a 
                href={intakeUrl} 
                target="_blank" 
                rel="noreferrer"
                className={buttonVariants({ variant: 'ghost', size: 'icon' })}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* You could list recent intake requests here */}
      </TabsContent>

      <TabsContent value="postprod" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Review</CardTitle>
              <CardDescription>
                Generate a secure link to send to your client for a specific project so they can provide their revision notes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateReview} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Active Project</Label>
                  <Select value={selectedProjectId} onValueChange={(val) => { if (val) setSelectedProjectId(val) }} required>
                    <SelectTrigger className="w-full bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Select a project...">
                        {selectedProjectId ? (() => {
                          const p = activeProjects.find(x => x.id === selectedProjectId);
                          return p ? `${p.title} (${p.client?.displayName})` : undefined;
                        })() : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      {activeProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="break-words whitespace-normal leading-tight text-left block w-full pr-4">
                            {p.title} ({p.client?.displayName})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Draft Link (Optional)</Label>
                  <Input 
                    placeholder="https://frame.io/..." 
                    type="url"
                    value={draftLink}
                    onChange={e => setDraftLink(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">Provide the link to the latest video export.</p>
                </div>
                <Button type="submit" disabled={isGenerating || !selectedProjectId}>
                  {isGenerating ? 'Generating...' : 'Generate Review Link'}
                </Button>
              </form>

              {generatedReviewToken && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900/50 space-y-3">
                  <Label className="text-green-800 dark:text-green-400">Link Generated!</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={`${getAppUrl()}/review/${generatedReviewToken}`} className="bg-white dark:bg-black font-mono text-xs" />
                    <Button onClick={copyReviewUrl} variant="outline" size="sm" className="w-20 shrink-0">
                      {copiedReview ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revision Inbox</CardTitle>
              <CardDescription>
                Recent client notes and feedback from your review requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reviewRequests.length === 0 ? (
                <div className="text-sm text-zinc-500 text-center py-8">
                  No review requests found.
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {reviewRequests.map((req) => (
                    <div key={req.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm">{req.project.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium ${
                            req.status === 'REPLIED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                            req.status === 'RESOLVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {req.status === 'REPLIED' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:bg-green-950/30"
                              onClick={() => handleResolveReviewRequest(req.id)}
                              title="Mark as resolved"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            onClick={() => handleCopyRequestLink(req.token, req.id)}
                            title="Copy Review Link"
                          >
                            {copiedRequestId === req.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 -mr-1"
                            onClick={() => handleDeleteReviewRequest(req.id)}
                            title="Delete Request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">Client: {req.client.displayName}</p>
                      {req.status === 'REPLIED' && (
                        <div className="mt-3 space-y-2 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded text-sm">
                          {req.clientNotes && (
                            <div>
                              <strong className="text-xs uppercase text-zinc-500 block mb-1">Notes:</strong>
                              <p className="whitespace-pre-wrap">{req.clientNotes}</p>
                            </div>
                          )}
                          {req.clientLinks && (
                            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                              <strong className="text-xs uppercase text-zinc-500 block mb-1">Links:</strong>
                              <p className="break-all">{req.clientLinks}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
