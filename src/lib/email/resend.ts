import { Resend } from 'resend'
import { InvoiceSentEmail } from '@/emails/invoice-sent'
import { render } from '@react-email/render'
import React from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendInvoiceEmail = async (
  to: string,
  invoiceData: {
    invoiceNumber: string;
    amountDue: string;
    dueDate: string;
    businessName: string;
    clientName: string;
    pdfLink: string;
  }
) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('STUBBING EMAIL (No RESEND_API_KEY found):', invoiceData)
    return { id: 'stub-id' }
  }

  const htmlContent = await render(React.createElement(InvoiceSentEmail, invoiceData))

  const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev', // Resend testing domain
    to,
    subject: `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.businessName}`,
    html: htmlContent,
  })

  if (error) {
    console.error('Failed to send email:', error)
    throw new Error(`Resend Error: ${error.message || JSON.stringify(error)}`)
  }

  return data
}
