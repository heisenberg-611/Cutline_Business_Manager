import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../../actions';

export async function GET(request: NextRequest) {
  try {
    // SECURITY CHECK: Verify admin session
    await requireAdmin();
    
    const searchParams = request.nextUrl.searchParams;
    const entitiesParam = searchParams.get('entities');
    const entities = entitiesParam ? entitiesParam.split(',') : ['businesses', 'users', 'subscriptionRequests', 'globalSettings', 'systemAlerts'];
    
    const backupData: any = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {}
    };

    const promises: Promise<any>[] = [];

    if (entities.includes('businesses')) {
      promises.push(prisma.business.findMany().then(res => backupData.data.businesses = res));
    }
    if (entities.includes('users')) {
      promises.push(prisma.user.findMany().then(res => backupData.data.users = res));
    }
    if (entities.includes('subscriptionRequests')) {
      promises.push(prisma.subscriptionRequest.findMany().then(res => backupData.data.subscriptionRequests = res));
    }
    if (entities.includes('globalSettings')) {
      promises.push(prisma.globalSettings.findMany().then(res => backupData.data.globalSettings = res));
    }
    if (entities.includes('systemAlerts')) {
      promises.push(prisma.systemAlert.findMany().then(res => backupData.data.systemAlerts = res));
    }

    await Promise.all(promises);

    const jsonString = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cutline-backup-${dateStr}.json"`,
      },
    });
  } catch (error) {
    console.error('Export Error:', error);
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
