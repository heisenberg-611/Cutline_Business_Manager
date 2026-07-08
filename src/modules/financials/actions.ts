'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { sendInvoiceEmail } from '@/lib/email/resend'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

async function requireBusiness() {
  const { orgId, userId } = await auth()
  if (!orgId) throw new Error('Unauthorized')
  return { orgId, userId }
}

async function withAudit<T>(
  entityType: string,
  entityId: string,
  action: string,
  metadata: any,
  fn: (tx: any) => Promise<T>
): Promise<T> {
  const { orgId, userId } = await requireBusiness()
  
  return await prisma.$transaction(async (tx) => {
    const result = await fn(tx)
    
    await tx.auditLog.create({
      data: {
        businessId: orgId,
        entityType,
        entityId,
        action,
        actorUserId: userId,
        metadataJson: JSON.stringify(metadata)
      }
    })
    
    return result
  })
}

// -----------------------------------------------------------------------------
// SCHEMAS
// -----------------------------------------------------------------------------

const LineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1),
  amountCents: z.number().min(0),
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
})

const InvoiceInputSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  taxRateBps: z.number().min(0).max(10000).default(0),
  lineItems: z.array(LineItemSchema).min(1, "At least one line item is required")
})

export type InvoiceInput = z.infer<typeof InvoiceInputSchema>

const PaymentInputSchema = z.object({
  amountCents: z.number().min(1),
  method: z.enum(["CREDIT_CARD", "BANK_TRANSFER", "CASH", "CHECK", "OTHER"]),
  reference: z.string().optional().nullable()
})

// -----------------------------------------------------------------------------
// ACTIONS
// -----------------------------------------------------------------------------

export async function createInvoice(input: InvoiceInput) {
  const { orgId } = await requireBusiness()
  const data = InvoiceInputSchema.parse(input)
  
  // Calculate totals
  const subtotalCents = data.lineItems.reduce((sum, item) => sum + (item.amountCents * item.quantity), 0)
  const taxAmountCents = Math.round(subtotalCents * (data.taxRateBps / 10000))
  const totalCents = subtotalCents + taxAmountCents

  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Generate sequential invoice number (naive approach with count, ideally use sequence table)
    const count = await tx.invoice.count({ where: { businessId: orgId } })
    const nextNum = (count + 1).toString().padStart(4, '0')
    const year = new Date().getFullYear()
    const invoiceNumber = `CUT-${year}-${nextNum}`

    // 2. Create invoice
    const newInvoice = await tx.invoice.create({
      data: {
        businessId: orgId,
        clientId: data.clientId,
        projectId: data.projectId || null,
        invoiceNumber,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        taxRateBps: data.taxRateBps,
        subtotalCents,
        taxAmountCents,
        totalCents,
        amountDueCents: totalCents,
        status: 'DRAFT',
        lineItems: {
          create: data.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            amountCents: item.amountCents,
            sourceType: item.sourceType || 'manual',
            sourceId: item.sourceId || null
          }))
        }
      }
    })

    return newInvoice
  })

  // We do audit outside so we don't need to double-nest tx, or we can just use withAudit next time.
  // We'll just create the audit log manually here since we created the entity inside.
  await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Invoice',
      entityId: invoice.id,
      action: 'CREATE',
      metadataJson: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, totalCents })
    }
  })

  revalidatePath('/dashboard/financials')
  return invoice
}

export async function updateInvoice(id: string, input: InvoiceInput) {
  const { orgId } = await requireBusiness()
  const data = InvoiceInputSchema.parse(input)

  return await withAudit('Invoice', id, 'UPDATE', { totalCents: data.lineItems.reduce((s,i)=>s+(i.amountCents*i.quantity),0) }, async (tx) => {
    const existing = await tx.invoice.findFirst({ where: { id, businessId: orgId } })
    if (!existing) throw new Error('Invoice not found')
    if (existing.status !== 'DRAFT') throw new Error('Only DRAFT invoices can be updated')

    const subtotalCents = data.lineItems.reduce((sum, item) => sum + (item.amountCents * item.quantity), 0)
    const taxAmountCents = Math.round(subtotalCents * (data.taxRateBps / 10000))
    const totalCents = subtotalCents + taxAmountCents

    // Delete existing line items
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } })

    const updated = await tx.invoice.update({
      where: { id },
      data: {
        clientId: data.clientId,
        projectId: data.projectId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
        taxRateBps: data.taxRateBps,
        subtotalCents,
        taxAmountCents,
        totalCents,
        amountDueCents: totalCents,
        lineItems: {
          create: data.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            amountCents: item.amountCents,
            sourceType: item.sourceType || 'manual',
            sourceId: item.sourceId || null
          }))
        }
      }
    })

    return updated
  })
}

export async function deleteInvoice(id: string) {
  const { orgId } = await requireBusiness()
  
  await prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findFirst({ where: { id, businessId: orgId } })
    if (!existing) throw new Error('Invoice not found')
    
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } })
    await tx.payment.deleteMany({ where: { invoiceId: id } })
    await tx.invoice.delete({ where: { id } })
    
    await tx.auditLog.create({
      data: {
        businessId: orgId,
        entityType: 'Invoice',
        entityId: id,
        action: 'DELETE',
        metadataJson: JSON.stringify({ invoiceNumber: existing.invoiceNumber })
      }
    })
  })
  
  revalidatePath('/dashboard/financials')
  redirect('/dashboard/financials')
}

export async function voidInvoice(id: string) {
  const { orgId } = await requireBusiness()
  
  return await withAudit('Invoice', id, 'VOID', {}, async (tx) => {
    const existing = await tx.invoice.findFirst({ 
      where: { id, businessId: orgId },
      include: { payments: true }
    })
    if (!existing) throw new Error('Invoice not found')
    if (existing.payments.length > 0) throw new Error('Cannot void invoice with existing payments. Create a Credit Note instead.')

    await tx.invoice.update({
      where: { id },
      data: { status: 'VOID', amountDueCents: 0 }
    })
  })
}

export async function sendInvoice(id: string) {
  const { orgId } = await requireBusiness()

  const result = await withAudit('Invoice', id, 'SENT', {}, async (tx) => {
    const existing = await tx.invoice.findFirst({ 
      where: { id, businessId: orgId },
      include: { client: true, business: true }
    })
    if (!existing) throw new Error('Invoice not found')
    if (existing.status !== 'DRAFT') throw new Error('Can only send DRAFT invoices')

    await tx.invoice.update({
      where: { id },
      data: { 
        status: 'SENT', 
        issuedAt: new Date(),
        emailSentAt: new Date()
      }
    })

    if (existing.client.email) {
      const amountFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: existing.currency }).format(existing.amountDueCents / 100)
      const dueDateFormatted = existing.dueDate ? existing.dueDate.toLocaleDateString() : 'Upon Receipt'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      await sendInvoiceEmail(existing.client.email, {
        invoiceNumber: existing.invoiceNumber,
        amountDue: amountFormatted,
        dueDate: dueDateFormatted,
        businessName: existing.business.name,
        clientName: existing.client.displayName,
        pdfLink: `${appUrl}/api/invoices/${id}/pdf`
      })
    }
  })

  revalidatePath(`/dashboard/financials/${id}`)
  revalidatePath('/dashboard/financials')
  return result
}

export async function recordPayment(invoiceId: string, input: z.infer<typeof PaymentInputSchema>) {
  const { orgId, userId } = await requireBusiness()
  const data = PaymentInputSchema.parse(input)

  const result = await withAudit('Payment', invoiceId, 'PAYMENT_RECORDED', { amountCents: data.amountCents }, async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, businessId: orgId } })
    if (!invoice) throw new Error('Invoice not found')
    if (invoice.status === 'VOID') throw new Error('Cannot pay a voided invoice')

    // Create payment
    await tx.payment.create({
      data: {
        businessId: orgId,
        invoiceId,
        amountCents: data.amountCents,
        method: data.method,
        reference: data.reference,
        reconciledAt: new Date(),
        reconciledByUserId: userId
      }
    })

    // Update invoice
    const newPaid = invoice.amountPaidCents + data.amountCents
    const newDue = Math.max(0, invoice.totalCents - newPaid)
    
    let newStatus = invoice.status
    if (newDue === 0) newStatus = 'PAID'
    else if (newPaid > 0) newStatus = 'PARTIALLY_PAID'

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaidCents: newPaid,
        amountDueCents: newDue,
        status: newStatus,
        paidAt: newDue === 0 ? new Date() : null
      }
    })
  })
  
  revalidatePath(`/dashboard/financials/${invoiceId}`)
  revalidatePath('/dashboard/financials')
  return result
}

export async function createCreditNote(invoiceId: string, amountCents: number, reason: string) {
  const { orgId } = await requireBusiness()
  
  return await withAudit('CreditNote', invoiceId, 'CREDIT_NOTE_CREATED', { amountCents, reason }, async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, businessId: orgId } })
    if (!invoice) throw new Error('Invoice not found')

    await tx.creditNote.create({
      data: {
        businessId: orgId,
        originalInvoiceId: invoiceId,
        amountCents,
        reason
      }
    })

    // Adjust invoice balance
    const newDue = Math.max(0, invoice.amountDueCents - amountCents)
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountDueCents: newDue,
        status: newDue === 0 && invoice.amountPaidCents > 0 ? 'PAID' : (newDue === 0 ? 'VOID' : invoice.status)
      }
    })
  })
}

export async function sendReminder(invoiceId: string, tone: 'gentle' | 'firm' | 'final') {
  const { orgId } = await requireBusiness()

  return await withAudit('Invoice', invoiceId, 'REMINDER_SENT', { tone }, async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, businessId: orgId } })
    if (!invoice) throw new Error('Invoice not found')

    await tx.invoiceReminder.create({
      data: {
        businessId: orgId,
        invoiceId,
        tone
      }
    })

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        reminderCount: { increment: 1 }
      }
    })
  })
}

export async function getInvoices(orgId: string) {
  if (!orgId) return []

  return await prisma.invoice.findMany({
    where: { businessId: orgId },
    include: {
      client: true,
      project: true,
      lineItems: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}
