'use server'

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InvoiceEmail } from '@/emails/invoice-email'
import prisma from '@/modules/core/db/prisma'
import React from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendDynamicInvoiceEmail(invoiceId: string, businessId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: {
      client: true,
      business: true,
      lineItems: true
    }
  })

  if (!invoice) throw new Error("Invoice not found")
  if (!invoice.client.email) throw new Error("Client has no email address")

  const business = invoice.business
  const client = invoice.client
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const paymentLink = `${appUrl}/invoices/${invoice.id}/pay` // Example link

  // Formatter for currency
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency,
    currencyDisplay: 'narrowSymbol'
  })

  // Format data
  const totalAmountStr = formatter.format(invoice.totalCents / 100)
  const subtotalStr = formatter.format(invoice.subtotalCents / 100)
  const taxStr = formatter.format(invoice.taxAmountCents / 100)
  const amountDueStr = formatter.format(invoice.amountDueCents / 100)
  const dueDateStr = invoice.dueDate ? invoice.dueDate.toLocaleDateString() : 'Upon Receipt'
  const issueDateStr = invoice.issuedAt ? invoice.issuedAt.toLocaleDateString() : new Date().toLocaleDateString()

  const formattedLineItems = invoice.lineItems.map(item => ({
    description: item.description,
    quantity: item.quantity,
    amount: formatter.format((item.amountCents * item.quantity) / 100)
  }))

  // Placeholder Replacement Logic
  const replacePlaceholders = (template: string) => {
    return template
      .replace(/\{\{client_name\}\}/g, client.displayName || '')
      .replace(/\{\{invoice_number\}\}/g, invoice.invoiceNumber)
      .replace(/\{\{due_date\}\}/g, dueDateStr)
      .replace(/\{\{total_amount\}\}/g, totalAmountStr)
      .replace(/\{\{business_name\}\}/g, business.name)
      .replace(/\{\{payment_link\}\}/g, paymentLink)
  }

  const subject = replacePlaceholders(business.emailSubjectTemplate)
  const bodyMessage = replacePlaceholders(business.emailBodyTemplate)

  // Generate Email HTML from React component
  const htmlContent = await render(
    React.createElement(InvoiceEmail, {
      businessName: business.name,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: issueDateStr,
      dueDate: dueDateStr,
      clientName: client.displayName,
      amountDue: amountDueStr,
      subtotal: subtotalStr,
      tax: taxStr,
      lineItems: formattedLineItems,
      bodyMessage: bodyMessage,
      paymentLink: paymentLink,
      currency: invoice.currency
    })
  )

  // Attempt to send via Resend
  if (process.env.RESEND_API_KEY) {
    await resend.emails.send({
      from: `invoices@cutlin.tech`,
      to: [client.email as string],
      subject: subject,
      html: htmlContent
    })
  } else {
    console.log("=========================================")
    console.log("Mock Email Send (No RESEND_API_KEY):")
    console.log("To:", client.email)
    console.log("Subject:", subject)
    console.log("Body preview:", bodyMessage)
    console.log("=========================================")
  }

}
