import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { renderToStream } from '@react-pdf/renderer'
import { InvoiceTemplate } from '@/lib/pdf/invoice-template'
import { getInvoiceDataForPdf } from '@/lib/invoices/pdf-data'

/**
 * GET /api/invoices/[id]/pdf
 *
 * Server-side PDF generation via @react-pdf/renderer's renderToStream.
 * This is the endpoint used for:
 *   - Direct browser downloads (anchor tag with target="_blank")
 *   - Server-side email attachments (fetch internally)
 *   - Inline PDF preview in iframes
 *
 * Security: uses Clerk's auth() to resolve the orgId (businessId),
 * which is then passed to the data mapper for multi-tenancy filtering.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()

  if (!orgId) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { id } = await params

  // Data mapper enforces businessId filter — no IDOR possible
  const invoiceData = await getInvoiceDataForPdf(id, orgId)

  if (!invoiceData) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Render the React PDF component to a Node.js readable stream.
  // renderToStream is the correct modern API for @react-pdf/renderer v4+.
  const pdfStream = await renderToStream(
    <InvoiceTemplate invoice={invoiceData} />
  )

  // Convert Node.js ReadableStream → Web ReadableStream for NextResponse
  const webStream = new ReadableStream({
    start(controller) {
      pdfStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      pdfStream.on('end', () => controller.close())
      pdfStream.on('error', (err: Error) => controller.error(err))
    },
  })

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${invoiceData.invoiceNumber}.pdf"`,
      // Force immediate re-fetch to reflect updates (e.g. business name changes) instantly
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
