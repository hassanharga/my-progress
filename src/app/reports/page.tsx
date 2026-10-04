import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validateUserToken } from '@/helpers/validate-user';
import type { ReportingSearchParams } from '@/schema/reporting';
import { readReportingForOwner } from '@/server/reporting/read-reporting';
import { parseReportingQuery } from '@/server/reporting/reporting-scope';

import db from '@/lib/db';
import { ReportsView } from '@/components/reports/ReportsView';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Reports',
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportingSearchParams> }) {
  const user = await validateUserToken();
  const owner = await db.user.findUnique({ where: { id: user.id! }, select: { timezone: true } });
  if (!owner) notFound();

  const parsed = parseReportingQuery({
    searchParams: await searchParams,
    mode: 'reports',
    now: new Date(),
    timezone: owner.timezone,
  });
  if (!parsed.ok) {
    const ownedProjects = await db.project.findMany({
      where: { ownerId: user.id! },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, archived: true },
    });
    return <ReportsView values={parsed.values} errors={parsed.errors} ownedProjects={ownedProjects} />;
  }

  let snapshot;
  try {
    snapshot = await readReportingForOwner({ ownerId: user.id!, query: parsed.query, prisma: db });
  } catch {
    return <ReportsView query={parsed.query} ownedProjects={[]} readError />;
  }
  if (!snapshot) notFound();
  return <ReportsView snapshot={snapshot} />;
}
