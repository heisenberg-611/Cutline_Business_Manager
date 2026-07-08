import { render } from '@react-email/render'
import { InvoiceSentEmail } from '../src/emails/invoice-sent'
import React from 'react'

async function main() {
  try {
    const html = await render(React.createElement(InvoiceSentEmail, {
      invoiceNumber: '123',
      amountDue: '100',
      dueDate: '2023-01-01',
      businessName: 'Test',
      clientName: 'Test',
      pdfLink: 'link'
    }))
    console.log("Render successful! Length:", html.length)
  } catch (err: any) {
    console.error("Render failed:", err)
  }
}

main()
