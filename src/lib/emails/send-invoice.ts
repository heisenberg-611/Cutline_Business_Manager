'use server'

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { InvoiceEmail } from '@/emails/invoice-email'
import { formatMoney } from '../format'
import prisma from '@/modules/core/db/prisma'
import React from 'react'
import { getAppUrl } from '@/lib/utils'

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
  const appUrl = getAppUrl()
  const paymentLink = `${appUrl}/invoices/${invoice.id}/pay` // Example link

  // Format data
  const totalAmountStr = formatMoney(invoice.totalCents, invoice.currency)
  const subtotalStr = formatMoney(invoice.subtotalCents, invoice.currency)
  const taxStr = formatMoney(invoice.taxAmountCents, invoice.currency)
  const amountDueStr = formatMoney(invoice.amountDueCents, invoice.currency)
  const dueDateStr = invoice.dueDate ? invoice.dueDate.toLocaleDateString() : 'Upon Receipt'
  const issueDateStr = invoice.issuedAt ? invoice.issuedAt.toLocaleDateString() : new Date().toLocaleDateString()

  const formattedLineItems = invoice.lineItems.map(item => ({
    description: item.description,
    quantity: item.quantity,
    amount: formatMoney(item.amountCents * item.quantity, invoice.currency)
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

  const firstAdmin = await prisma.businessMembership.findFirst({
    where: { businessId, role: 'org:admin' },
    include: { user: true }
  })
  const businessEmail = firstAdmin?.user?.email

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
      currency: invoice.currency,
      businessEmail: businessEmail
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
