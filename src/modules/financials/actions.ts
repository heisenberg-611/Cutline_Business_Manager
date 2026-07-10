'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { generateInvoiceNumber } from '@/lib/invoices/number-generator'
import { sendDynamicInvoiceEmail } from '@/lib/emails/send-invoice'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { triggerPdfGeneration } from '@/lib/qstash/client'

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
  lineItems: z.array(LineItemSchema).min(1, "At least one line item is required"),
  currency: z.string().optional().default('USD')
})

export type InvoiceInput = z.infer<typeof InvoiceInputSchema>

const PaymentInputSchema = z.object({
  amountCents: z.number().min(1),
  method: z.enum(["CREDIT_CARD", "BANK_TRANSFER", "CASH", "CHECK", "OTHER"]),
  reference: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable()
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
    // 1. Generate sequential invoice number atomically
    const invoiceNumber = await generateInvoiceNumber(tx, orgId)

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
        currency: data.currency,
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

  // Trigger background PDF generation
  await triggerPdfGeneration(invoice.id, orgId)

  revalidatePath('/dashboard/financials')
  return invoice
}

export async function updateInvoice(id: string, input: InvoiceInput) {
  const { orgId } = await requireBusiness()
  const data = InvoiceInputSchema.parse(input)

  return await withAudit('Invoice', id, 'UPDATE', { totalCents: data.lineItems.reduce((s, i) => s + (i.amountCents * i.quantity), 0) }, async (tx) => {
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
        currency: data.currency,
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

    // Trigger background PDF generation
    await triggerPdfGeneration(id, orgId)

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
    await tx.invoice.deleteMany({ where: { id } })

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
        emailSentAt: existing.client.email ? new Date() : null
      }
    })

    if (existing.client.email) {
      await sendDynamicInvoiceEmail(id, orgId)
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

    const paymentDate = data.paidAt ? new Date(data.paidAt) : new Date()

    // Create payment
    await tx.payment.create({
      data: {
        businessId: orgId,
        invoiceId,
        amountCents: data.amountCents,
        method: data.method,
        reference: data.reference,
        reconciledAt: new Date(),
        reconciledByUserId: userId,
        createdAt: paymentDate
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
        paidAt: newDue === 0 ? paymentDate : null
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
      project: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}
