import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validateUserToken } from '@/helpers/validate-user';
import type { ReportingSearchParams } from '@/schema/reporting';
import { readReportingForOwner } from '@/server/reporting/read-reporting';
import { parseReportingQuery } from '@/server/reporting/reporting-scope';

import db from '@/lib/db';
import { InsightsView } from '@/components/insights/InsightsView';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Insights',
};

type InsightsPageProps = { searchParams: Promise<ReportingSearchParams> };

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const user = await validateUserToken();
  const owner = await db.user.findUnique({ where: { id: user.id! }, select: { timezone: true } });
  if (!owner) notFound();

  const parsed = parseReportingQuery({
    searchParams: await searchParams,
    mode: 'insights',
    now: new Date(),
    timezone: owner.timezone,
  });
  if (!parsed.ok) {
    const ownedProjects = await db.project.findMany({
      where: { ownerId: user.id! },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, archived: true },
    });
    return <InsightsView values={parsed.values} errors={parsed.errors} ownedProjects={ownedProjects} />;
  }

  let snapshot;
  try {
    snapshot = await readReportingForOwner({ ownerId: user.id!, query: parsed.query, prisma: db });
  } catch {
    return <InsightsView query={parsed.query} ownedProjects={[]} readError />;
  }
  if (!snapshot) notFound();
  return <InsightsView snapshot={snapshot} />;
}
