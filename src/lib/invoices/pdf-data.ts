import prisma from '@/modules/core/db/prisma'
import type { InvoiceData, InvoiceStatus } from '@/lib/pdf/invoice-template'

/**
 * Maps raw Prisma Invoice data → the exact InvoiceData shape expected by
 * the InvoiceTemplate PDF component.
 *
 * Architecture decisions:
 * - Uses findFirst + businessId filter (not findUnique) to enforce multi-tenancy.
 *   This prevents IDOR: a user in Org A can never fetch Org B's invoice,
 *   even if they somehow obtain the invoiceId.
 * - Money values stay as integer cents — the template handles /100 formatting.
 * - Graceful fallbacks for optional fields (email, address) so the PDF
 *   never renders "undefined".
 */
export async function getInvoiceDataForPdf(
  invoiceId: string,
  businessId: string
): Promise<InvoiceData | null> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      businessId, // Multi-tenancy guard — never remove this
    },
    include: {
      business: true,
      client: true,
      lineItems: true,
      payments: true,
    },
  })

  if (!invoice) return null

  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status as InvoiceStatus,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotalCents: invoice.subtotalCents,
    taxRateBps: invoice.taxRateBps,
    taxAmountCents: invoice.taxAmountCents,
    totalCents: invoice.totalCents,
    amountPaidCents: invoice.amountPaidCents,
    amountDueCents: invoice.amountDueCents,
    notes: invoice.notes,

    business: {
      name: invoice.business.name,
      // Business model doesn't have email/phone/address fields yet,
      // so we provide sensible fallbacks. When those fields are added
      // to the schema, swap these out.
      email: undefined,
      phone: undefined,
      address: undefined,
    },

    client: {
      displayName: invoice.client.displayName,
      companyName: invoice.client.companyName,
      email: invoice.client.email ?? undefined,
      phone: invoice.client.phone ?? undefined,
      address: undefined, // Client model doesn't have address yet
    },

    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      amountCents: item.amountCents,
    })),

    payments: invoice.payments.map((p) => ({
      date: p.createdAt,
      amountCents: p.amountCents,
      method: p.method,
      reference: p.reference,
    })),
  }
}
