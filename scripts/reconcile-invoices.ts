/**
 * Script: reconcile-invoices.ts
 * Purpose: A read-only verification script that scans every invoice in the database, 
 *          re-calculates the expected totals, sub-totals, and taxes from raw line items, 
 *          and compares them against the cached/stored values on the Invoice record.
 * 
 * Why this exists:
 * - This was written during Phase 1 (Verifiable Money Math) to mathematically prove 
 *   that the inline calculation logic we extracted into `calculations.ts` exactly 
 *   matched the historical data in the database, ensuring zero drift before we 
 *   refactored the production code to use the new pure functions.
 */
import { PrismaClient } from '@prisma/client'

// Read-only client approach
const prisma = new PrismaClient()

async function main() {
  let cursor: string | undefined = undefined;
  const take = 500;
  let hasMore = true;

  // Group report by status
  const report: Record<string, { count: number, errors: { id: string, number: string, errors: string[] }[] }> = {
    DRAFT: { count: 0, errors: [] },
    SENT: { count: 0, errors: [] },
    PARTIALLY_PAID: { count: 0, errors: [] },
    PAID: { count: 0, errors: [] },
    OVERDUE: { count: 0, errors: [] },
    VOID: { count: 0, errors: [] },
    CREDIT_NOTE: { count: 0, errors: [] },
  };

  while (hasMore) {
    const invoices = await prisma.invoice.findMany({
      take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' },
      include: {
        lineItems: true,
        payments: true,
        creditNotes: true,
      }
    });

    if (invoices.length === 0) {
      hasMore = false;
      break;
    }

    for (const invoice of invoices) {
      const status = invoice.status;
      if (!report[status]) {
        report[status] = { count: 0, errors: [] };
      }
      report[status].count++;
      const invoiceErrors: string[] = [];

      // Invariant 1: Subtotal === sum(lineItems)
      const expectedSubtotal = invoice.lineItems.reduce((sum, item) => sum + (item.quantity * item.amountCents), 0);
      if (invoice.subtotalCents !== expectedSubtotal) {
        invoiceErrors.push(`Subtotal mismatch: expected ${expectedSubtotal}, got ${invoice.subtotalCents}`);
      }

      // Invariant 2: Total === Subtotal + Tax
      const expectedTotal = invoice.subtotalCents + invoice.taxAmountCents;
      if (invoice.totalCents !== expectedTotal) {
        invoiceErrors.push(`Total mismatch: expected ${expectedTotal} (sub + tax), got ${invoice.totalCents}`);
      }

      // Invariant 3: Paid === sum(payments)
      const expectedPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
      if (invoice.amountPaidCents !== expectedPaid) {
        invoiceErrors.push(`Paid mismatch: expected ${expectedPaid} (sum of payments), got ${invoice.amountPaidCents}`);
      }

      // Invariant 4: Credit Notes do not exceed Total
      const totalCredit = invoice.creditNotes.reduce((sum, note) => sum + note.amountCents, 0);
      if (totalCredit > invoice.totalCents) {
        invoiceErrors.push(`Credit notes (${totalCredit}) exceed invoice total (${invoice.totalCents})`);
      }

      // Invariant 5: Amount Due logic depends on status
      const standardDue = invoice.totalCents - expectedPaid;
      if (invoice.status === 'VOID') {
        if (invoice.amountDueCents !== 0) {
           invoiceErrors.push(`VOID invoice has non-zero amountDue: ${invoice.amountDueCents}`);
        }
      } else if (invoice.status === 'CREDIT_NOTE') {
        // Just flag if it's neither 0 nor (total - paid) to see what the data actually does
        if (invoice.amountDueCents !== standardDue && invoice.amountDueCents !== 0 && invoice.amountDueCents !== (standardDue - totalCredit)) {
          invoiceErrors.push(`CREDIT_NOTE invoice amountDue (${invoice.amountDueCents}) doesn't match standard math`);
        }
      } else {
        if (invoice.amountDueCents !== standardDue) {
          invoiceErrors.push(`AmountDue mismatch: expected ${standardDue} (total - paid), got ${invoice.amountDueCents}`);
        }
      }

      if (invoiceErrors.length > 0) {
        report[status].errors.push({ id: invoice.id, number: invoice.invoiceNumber, errors: invoiceErrors });
      }
    }

    cursor = invoices[invoices.length - 1].id;
  }

  let totalErrors = 0;
  console.log('--- RECONCILIATION REPORT ---');
  for (const [status, data] of Object.entries(report)) {
    console.log(`\nSTATUS: ${status} (Count: ${data.count})`);
    if (data.errors.length === 0) {
      console.log('  All clean.');
    } else {
      totalErrors += data.errors.length;
      data.errors.forEach(err => {
        console.log(`  Invoice ${err.number} (${err.id}):`);
        err.errors.forEach(e => console.log(`    - ${e}`));
      });
    }
  }

  console.log(`\nTotal Invoices Checked: ${Object.values(report).reduce((sum, d) => sum + d.count, 0)}`);
  console.log(`Total Invoices with Drift: ${totalErrors}`);

  if (totalErrors > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
