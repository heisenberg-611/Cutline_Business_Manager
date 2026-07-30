import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { recordPayment } from '../actions'
import prisma from '@/modules/core/db/prisma'

// Mock Clerk auth to bypass the boundary
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({
    userId: 'user_test_123',
    orgId: 'org_test_123',
    orgRole: 'org:admin' // Needed to pass requireAdmin
  })
}))

// Mock next/cache since we are not in a Next.js environment
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Integration: recordPayment', () => {
  const TEST_ORG_ID = 'org_test_123'
  let testClientId: string
  let testInvoiceId: string

  beforeAll(async () => {
    // Note: This test expects to be run against a dedicated TEST database,
    // NOT the development database. It will create and teardown real rows.

    // 1. Setup a test business
    await prisma.business.upsert({
      where: { id: TEST_ORG_ID },
      update: {},
      create: {
        id: TEST_ORG_ID,
        name: 'Test Business'
      }
    })

    // 2. Setup a test client
    const client = await prisma.client.create({
      data: {
        businessId: TEST_ORG_ID,
        displayName: 'Test Client',
      }
    })
    testClientId = client.id

    // 3. Setup a test invoice
    const invoice = await prisma.invoice.create({
      data: {
        businessId: TEST_ORG_ID,
        clientId: testClientId,
        invoiceNumber: 'TEST-001',
        status: 'SENT',
        currency: 'USD',
        taxRateBps: 0,
        subtotalCents: 10000, // $100
        taxAmountCents: 0,
        totalCents: 10000,
        amountDueCents: 10000,
        amountPaidCents: 0,
      }
    })
    testInvoiceId = invoice.id
  })

  afterAll(async () => {
    // Teardown the test data
    await prisma.invoice.deleteMany({ where: { businessId: TEST_ORG_ID } })
    await prisma.client.deleteMany({ where: { businessId: TEST_ORG_ID } })
    await prisma.business.deleteMany({ where: { id: TEST_ORG_ID } })
  })

  it('records a valid payment and updates denormalized fields correctly', async () => {
    await recordPayment(testInvoiceId, {
      amountCents: 4000, // Partial payment of $40
      method: 'BANK_TRANSFER',
    })

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: testInvoiceId } })
    const payments = await prisma.payment.findMany({ where: { invoiceId: testInvoiceId } })

    // Assert the denormalized fields land correctly
    expect(invoice.amountPaidCents).toBe(4000)
    expect(invoice.amountDueCents).toBe(6000)
    expect(invoice.status).toBe('PARTIALLY_PAID')

    // Assert it matches the Payment rows
    const paymentsTotal = payments.reduce((sum, p) => sum + p.amountCents, 0)
    expect(paymentsTotal).toBe(invoice.amountPaidCents)
  })

  it('throws an error and prevents over-payment', async () => {
    // Currently 6000 cents due
    const overPaymentAmount = 7000 

    await expect(
      recordPayment(testInvoiceId, {
        amountCents: overPaymentAmount,
        method: 'BANK_TRANSFER',
      })
    ).rejects.toThrow(/exceeds remaining balance/)

    // Assert the invoice was NOT updated
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: testInvoiceId } })
    expect(invoice.amountPaidCents).toBe(4000) // Still 4000 from previous test
    expect(invoice.amountDueCents).toBe(6000)
  })
})
