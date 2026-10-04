import { NextRequest, NextResponse } from 'next/server';
import { validateUserToken } from '@/helpers/validate-user';
import { buildReportWorkbook, ReportWorkbookTooLargeError } from '@/server/reporting/build-report-workbook';
import { readReportingForOwner } from '@/server/reporting/read-reporting';
import { parseReportingQuery } from '@/server/reporting/reporting-scope';

import db from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const privateHeaders = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  const user = await validateUserToken();
  try {
    const owner = await db.user.findUnique({ where: { id: user.id! }, select: { timezone: true } });
    if (!owner) return NextResponse.json({ error: 'Report not found.' }, { status: 404, headers: privateHeaders });

    const parsed = parseReportingQuery({
      searchParams: request.nextUrl.searchParams,
      mode: 'reports',
      now: new Date(),
      timezone: owner.timezone,
    });
    if (!parsed.ok)
      return NextResponse.json(
        { error: 'Correct the report filters and try again.', fields: parsed.errors },
        { status: 400, headers: privateHeaders }
      );

    const snapshot = await readReportingForOwner({ ownerId: user.id!, query: parsed.query, prisma: db });
    if (!snapshot) return NextResponse.json({ error: 'Report not found.' }, { status: 404, headers: privateHeaders });
    const workbook = buildReportWorkbook(snapshot);
    const buffer = await workbook.xlsx.writeBuffer();
    const bytes = new Uint8Array(buffer);
    const filename = `my-progress-report-${parsed.query.from}-to-${parsed.query.to}.xlsx`;
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        ...privateHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof ReportWorkbookTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413, headers: privateHeaders });
    }
    return NextResponse.json(
      { error: 'The report could not be downloaded. Keep your filters and try again.' },
      { status: 500, headers: privateHeaders }
    );
  }
}
