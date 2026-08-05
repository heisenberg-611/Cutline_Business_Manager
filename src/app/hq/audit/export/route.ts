import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../../actions';
import { format } from 'date-fns';

/**
 * Ceiling on a single export. The audit log is append-only, so an unbounded
 * findMany here was guaranteed to time out or exhaust memory eventually.
 */
const MAX_ROWS = 50_000;

/**
 * Renders one CSV cell.
 *
 * Quoting alone does not make a cell inert: Excel and Sheets still evaluate a
 * quoted value beginning with =, +, - or @, so an audit entry could execute a
 * formula on the machine of whoever opened the export. Prefixing with a single
 * quote is the standard neutralisation and is stripped on display.
 */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const logs = await prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
    });

    const csvRows: string[] = [];
    csvRows.push(['Timestamp', 'Admin Email', 'Action', 'Target ID', 'Metadata'].join(','));

    for (const log of logs) {
      csvRows.push(
        [
          csvCell(format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')),
          csvCell(log.adminEmail),
          csvCell(log.action),
          csvCell(log.targetId),
          csvCell(log.metadata ? JSON.stringify(log.metadata) : ''),
        ].join(',')
      );
    }

    // Exporting the audit trail is itself an auditable act, and was previously
    // the one action that left no record of having happened.
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'EXPORT_AUDIT_LOG',
        targetId: 'global',
        metadata: { rows: logs.length, truncated: logs.length === MAX_ROWS },
      },
    });

    const csvContent = csvRows.join('\n');
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error('Audit Export Error:', error);
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
