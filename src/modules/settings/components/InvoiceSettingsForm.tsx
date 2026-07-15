'use client'

import React, { useState, useTransition } from 'react'
import { updateInvoiceSettings } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function InvoiceSettingsForm({ business }: { business: any }) {
  const [prefix, setPrefix] = useState(business.invoicePrefix || 'INV')
  const [separator, setSeparator] = useState(business.invoiceSeparator || '-')
  const [subjectTemplate, setSubjectTemplate] = useState(business.emailSubjectTemplate || '')
  const [bodyTemplate, setBodyTemplate] = useState(business.emailBodyTemplate || '')
  const [paymentInstructions, setPaymentInstructions] = useState(business.paymentInstructions || '')
  const [feedbackSubjectTemplate, setFeedbackSubjectTemplate] = useState(business.feedbackEmailSubjectTemplate || '')
  const [feedbackBodyTemplate, setFeedbackBodyTemplate] = useState(business.feedbackEmailBodyTemplate || '')
  
  const [isPending, startTransition] = useTransition()
  
  const nextNumPreview = `${prefix}${separator}${String(business.invoiceSequence + 1).padStart(4, '0')}`

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateInvoiceSettings({
          invoicePrefix: prefix,
          invoiceSeparator: separator,
          emailSubjectTemplate: subjectTemplate,
          emailBodyTemplate: bodyTemplate,
          paymentInstructions: paymentInstructions,
          feedbackEmailSubjectTemplate: feedbackSubjectTemplate,
          feedbackEmailBodyTemplate: feedbackBodyTemplate
        })
        alert("Settings saved successfully")
      } catch (err: any) {
        alert("Failed to save settings: " + err.message)
      }
    })
  }

  const insertPlaceholder = (placeholder: string | null) => {
    if (placeholder) setBodyTemplate((prev: string) => prev + placeholder)
  }

  const insertFeedbackPlaceholder = (placeholder: string | null) => {
    if (placeholder) setFeedbackBodyTemplate((prev: string) => prev + placeholder)
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column */}
        <div className="space-y-8">
          <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardHeader>
              <CardTitle>Invoice Numbering</CardTitle>
              <CardDescription>Customize how your invoice numbers are generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Prefix</Label>
                  <Input 
                    value={prefix} 
                    onChange={(e) => setPrefix(e.target.value)} 
                    placeholder="INV"
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label>Separator</Label>
                  <Input 
                    value={separator} 
                    onChange={(e) => setSeparator(e.target.value)} 
                    placeholder="-"
                  />
                </div>
              </div>
              <div className="pt-2">
                <p className="text-sm text-zinc-500">
                  Next Invoice Number Preview: <strong className="text-zinc-900 dark:text-zinc-100">{nextNumPreview}</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardHeader>
              <CardTitle>Email Template Editor</CardTitle>
              <CardDescription>Customize the email sent to your clients with their invoice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input 
                  value={subjectTemplate} 
                  onChange={(e) => setSubjectTemplate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label>Email Body</Label>
                  <Select onValueChange={insertPlaceholder} value="">
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Insert Placeholder" />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      <SelectItem value="{{client_name}}">Client Name</SelectItem>
                      <SelectItem value="{{invoice_number}}">Invoice Number</SelectItem>
                      <SelectItem value="{{due_date}}">Due Date</SelectItem>
                      <SelectItem value="{{total_amount}}">Total Amount</SelectItem>
                      <SelectItem value="{{business_name}}">Business Name</SelectItem>
                      <SelectItem value="{{payment_link}}">Payment Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea 
                  value={bodyTemplate} 
                  onChange={(e) => setBodyTemplate(e.target.value)} 
                  className="min-h-[200px]"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <h4 className="text-sm font-semibold">Live Preview</h4>
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-md text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {bodyTemplate
                    .replace(/\{\{client_name\}\}/g, 'Acme Corp')
                    .replace(/\{\{invoice_number\}\}/g, nextNumPreview)
                    .replace(/\{\{due_date\}\}/g, new Date().toLocaleDateString())
                    .replace(/\{\{total_amount\}\}/g, '$1,200.00')
                    .replace(/\{\{business_name\}\}/g, business.name)
                    .replace(/\{\{payment_link\}\}/g, 'https://pay.stripe.com/abc')
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardHeader>
              <CardTitle>Payment Instructions</CardTitle>
              <CardDescription>Instructions shown to clients when they click "Pay Invoice". Useful for providing bank details, wire instructions, or custom links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea 
                  value={paymentInstructions} 
                  onChange={(e) => setPaymentInstructions(e.target.value)} 
                  placeholder="e.g. Please wire transfer to..."
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardHeader>
              <CardTitle>Feedback Email Template Editor</CardTitle>
              <CardDescription>Customize the email sent to request feedback from clients after final delivery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input 
                  value={feedbackSubjectTemplate} 
                  onChange={(e) => setFeedbackSubjectTemplate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label>Email Body</Label>
                  <Select onValueChange={insertFeedbackPlaceholder} value="">
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Insert Placeholder" />
                    </SelectTrigger>
                    <SelectContent align="start" alignItemWithTrigger={false}>
                      <SelectItem value="{{client_name}}">Client Name</SelectItem>
                      <SelectItem value="{{project_name}}">Project Name</SelectItem>
                      <SelectItem value="{{business_name}}">Business Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea 
                  value={feedbackBodyTemplate} 
                  onChange={(e) => setFeedbackBodyTemplate(e.target.value)} 
                  className="min-h-[200px]"
                />
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <h4 className="text-sm font-semibold">Live Preview</h4>
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-md text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {feedbackBodyTemplate
                    .replace(/\{\{client_name\}\}/g, 'Acme Corp')
                    .replace(/\{\{project_name\}\}/g, 'Awesome Video Project')
                    .replace(/\{\{business_name\}\}/g, business.name)
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button onClick={handleSave} disabled={isPending} className="w-40 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-medium">
          {isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
