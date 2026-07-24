import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/modules/core/db/prisma';
import { PLANS } from '@/lib/subscription';
import { createAdminNotification } from '@/lib/admin-notifications';

export async function POST(req: Request) {
  try {
    const { orgId, userId } = await auth();
    
    if (!orgId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { plan, trxId, paymentMethod } = body;

    if (!plan || !trxId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Basic validation
    if (plan !== PLANS.PRO && plan !== PLANS.BUSINESS) {
      return NextResponse.json({ error: 'Invalid plan requested' }, { status: 400 });
    }

    // Fetch business name
    const business = await prisma.business.findUnique({
      where: { id: orgId },
      select: { name: true }
    });

    // Create the pending request
    const request = await prisma.subscriptionRequest.create({
      data: {
        businessId: orgId,
        planRequested: plan as any,
        transactionId: trxId,
        paymentMethod: paymentMethod,
        status: 'PENDING',
      },
    });

    await createAdminNotification({
      title: 'New Subscription Request',
      message: `${business?.name || 'A business'} has submitted a payment for the ${plan} plan.`,
      type: 'subscription',
      actionUrl: '/hq/subscriptions',
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error('[SUBSCRIPTION_REQUEST_ERROR]', error);
    
    // Check for unique constraint violation (same Trx ID submitted twice)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
       return NextResponse.json({ error: 'Transaction ID already exists' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
