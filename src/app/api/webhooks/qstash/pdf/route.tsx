import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/dist/nextjs'
import { renderToStream } from '@react-pdf/renderer'
import { InvoiceTemplate } from '@/lib/pdf/invoice-template'
import { getInvoiceDataForPdf } from '@/lib/invoices/pdf-data'
import { put } from '@vercel/blob'
import prisma from '@/modules/core/db/prisma'
import React from 'react'

/**
 * POST /api/webhooks/qstash/pdf
 *
 * Background worker for generating Invoice PDFs and storing them in Vercel Blob.
 * Protected by QStash signature verification.
 */
async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const { invoiceId, orgId } = body

    if (!invoiceId || !orgId) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const invoiceData = await getInvoiceDataForPdf(invoiceId, orgId)

    if (!invoiceData) {
      return new NextResponse('Invoice not found', { status: 404 })
    }

    // Generate PDF stream
    const pdfStream = await renderToStream(<InvoiceTemplate invoice={invoiceData} />)

    // Convert Node stream to Buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string | Uint8Array))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Store in Vercel Blob
    // Idempotent: same filename overrides existing if retried
    const filename = `invoices/${orgId}/${invoiceData.invoiceNumber}.pdf`
    
    const blob = await put(filename, pdfBuffer, { 
      access: 'public',
      addRandomSuffix: false, // Ensures idempotency, overwriting the same blob
      contentType: 'application/pdf'
    })

    // Update the invoice record with the new PDF URL
    await prisma.invoice.updateMany({
      where: { id: invoiceId, businessId: orgId },
      data: { pdfUrl: blob.url }
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (error) {
    console.error('PDF Generation Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export const POST = async (req: NextRequest) => {
  const verifier = verifySignatureAppRouter(handler)
  return verifier(req)
}
