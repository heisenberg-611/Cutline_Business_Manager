/**
 * Atomically increments the invoice sequence for a business and returns the formatted invoice number.
 * 
 * @param tx The Prisma transaction client
 * @param businessId The ID of the business
 * @returns The formatted invoice number string (e.g. "INV-0042")
 */
export async function generateInvoiceNumber(
  tx: any, 
  businessId: string
): Promise<string> {
  // We use `update` to atomically increment and fetch the new sequence number
  const business = await tx.business.update({
    where: { id: businessId },
    data: {
      invoiceSequence: { increment: 1 }
    },
    select: {
      invoicePrefix: true,
      invoiceSeparator: true,
      invoiceSequence: true
    }
  })

  // Format: PREFIX + SEPARATOR + PADDED_SEQUENCE
  // e.g. "INV" + "-" + "0042" => "INV-0042"
  const paddedSequence = business.invoiceSequence.toString().padStart(4, '0')
  
  // Optionally, if the user wants the year in the number, they can add it to the prefix manually in settings
  return `${business.invoicePrefix}${business.invoiceSeparator}${paddedSequence}`
}
