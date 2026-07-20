'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import type { InvoiceData } from '@/lib/pdf/invoice-template'

export function PreviewInvoiceDialog({ invoiceData }: { invoiceData: InvoiceData }) {
  const [isOpen, setIsOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (isOpen && !pdfUrl) {
      let isMounted = true
      setIsGenerating(true)

      const generatePdf = async () => {
        try {
          // Dynamic import to avoid SSR and Turbopack issues
          const { pdf } = await import('@react-pdf/renderer')
          const { InvoiceTemplate } = await import('@/lib/pdf/invoice-template')

          const blob = await pdf(<InvoiceTemplate invoice={invoiceData} />).toBlob()
          if (isMounted) {
            setPdfUrl(URL.createObjectURL(blob))
            setIsGenerating(false)
          }
        } catch (error) {
          console.error('Failed to generate PDF preview:', error)
          if (isMounted) setIsGenerating(false)
        }
      }

      generatePdf()

      return () => {
        isMounted = false
      }
    }
  }, [isOpen, pdfUrl, invoiceData])

  // Cleanup object URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button variant="outline" className="text-zinc-500 w-full sm:w-auto"><ExternalLink className="h-4 w-4 mr-2" /> Open PDF</Button>}
      />
      <DialogContent className="max-w-5xl sm:max-w-5xl w-[95vw] h-[90dvh] flex flex-col p-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl m-auto">
        <DialogHeader className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-[#0A0A0A]">
          <DialogTitle>Invoice Preview</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center overflow-hidden relative">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Generating preview...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="Invoice PDF Preview"
            />
          ) : (
            <p className="text-zinc-500">Failed to load PDF</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
