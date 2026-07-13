'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ExpenseInputSchema = z.object({
  description: z.string().min(1, "Name/Description is required"),
  category: z.string().min(1, "Category is required"),
  amountCents: z.number().min(0, "Amount must be positive"),
  dateIncurred: z.string().min(1, "Date is required"),
  projectId: z.string().optional().nullable(),
  currency: z.string().default("USD")
})

export type ExpenseInput = z.infer<typeof ExpenseInputSchema>

async function requireBusiness() {
  const { orgId, userId } = await auth()
  if (!orgId) throw new Error('Unauthorized')
  return { orgId, userId }
}

export async function getExpenses(orgId: string) {
  if (!orgId) return []

  return await prisma.expense.findMany({
    where: { businessId: orgId },
    include: {
      project: { select: { title: true } }
    },
    orderBy: { dateIncurred: 'desc' }
  })
}

export async function createExpense(input: ExpenseInput) {
  const { orgId, userId } = await requireBusiness()
  const data = ExpenseInputSchema.parse(input)

  const expense = await prisma.$transaction(async (tx) => {
    const newExpense = await tx.expense.create({
      data: {
        businessId: orgId,
        description: data.description,
        category: data.category,
        amountCents: data.amountCents,
        dateIncurred: new Date(data.dateIncurred),
        projectId: data.projectId || null,
        currency: data.currency
      }
    })

    await tx.auditLog.create({
      data: {
        businessId: orgId,
        entityType: 'Expense',
        entityId: newExpense.id,
        action: 'CREATE',
        actorUserId: userId,
        metadataJson: JSON.stringify({ amountCents: data.amountCents, category: data.category })
      }
    })

    return newExpense
  })

  revalidatePath('/dashboard/financials')
  return expense
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const { orgId, userId } = await requireBusiness()
  const data = ExpenseInputSchema.parse(input)

  const expense = await prisma.$transaction(async (tx) => {
    const existing = await tx.expense.findFirst({ where: { id, businessId: orgId } })
    if (!existing) throw new Error('Expense not found')

    const updated = await tx.expense.update({
      where: { id, businessId: orgId },
      data: {
        description: data.description,
        category: data.category,
        amountCents: data.amountCents,
        dateIncurred: new Date(data.dateIncurred),
        projectId: data.projectId || null,
        currency: data.currency
      }
    })

    await tx.auditLog.create({
      data: {
        businessId: orgId,
        entityType: 'Expense',
        entityId: id,
        action: 'UPDATE',
        actorUserId: userId,
        metadataJson: JSON.stringify({ amountCents: data.amountCents, category: data.category })
      }
    })

    return updated
  })

  revalidatePath('/dashboard/financials')
  return expense
}

export async function deleteExpense(id: string) {
  const { orgId, userId } = await requireBusiness()

  await prisma.$transaction(async (tx) => {
    const existing = await tx.expense.findFirst({ where: { id, businessId: orgId } })
    if (!existing) throw new Error('Expense not found')

    await tx.expense.delete({ where: { id, businessId: orgId } })

    await tx.auditLog.create({
      data: {
        businessId: orgId,
        entityType: 'Expense',
        entityId: id,
        action: 'DELETE',
        actorUserId: userId,
        metadataJson: JSON.stringify({ amountCents: existing.amountCents, category: existing.category })
      }
    })
  })

  revalidatePath('/dashboard/financials')
}
