import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../../../actions';
import { collectUserData } from '@/lib/user-export/collect';
import { renderUserExportHtml } from '@/lib/user-export/render-html';

/**
 * Data-subject export: everything the platform holds about one user, as a
 * readable HTML report (default) or a machine-readable JSON file.
 *
 * GET /hq/api/export/user?userId=<clerk user id>&format=html|json
 */
export async function GET(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const userId = request.nextUrl.searchParams.get('userId')?.trim();
    const format = request.nextUrl.searchParams.get('format') === 'json' ? 'json' : 'html';

    if (!userId) {
      return new NextResponse('Missing userId', { status: 400 });
    }

    const [bundle, settings] = await Promise.all([
      collectUserData(userId),
      prisma.globalSettings.findUnique({
        where: { id: 'default' },
        select: { supportEmail: true },
      }),
    ]);

    if (!bundle) {
      return new NextResponse('No user found with that ID', { status: 404 });
    }

    // Handing over someone's personal data is itself an auditable event.
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'EXPORT_USER_DATA',
        targetId: userId,
        metadata: { email: bundle.subject.email, format },
      },
    });

    const slug =
      bundle.subject.email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '-') || 'user';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `my-data-${slug}-${dateStr}.${format}`;

    const body =
      format === 'json'
        ? JSON.stringify(
            {
              readme:
                "This file is a complete copy of the personal data held about this account. Each section has a title and a description explaining what it contains; 'rows' holds the records themselves, already formatted for reading. All dates are UTC.",
              ...bundle,
            },
            null,
            2,
          )
        : renderUserExportHtml(bundle, { supportEmail: settings?.supportEmail });

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':
          format === 'json' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('User Data Export Error:', error);
    return new NextResponse('Failed to build the export', { status: 500 });
  }
}
