import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { validateUserToken } from '@/helpers/validate-user';
import { projectIdSchema } from '@/schema/project';
import { parseProjectWorkspaceQuery } from '@/schema/project-workspace';
import { readProjectWorkspaceForOwner } from '@/server/projects/read-project-workspace';

import db from '@/lib/db';
import { ProjectWorkspace } from '@/components/project-workspace/ProjectWorkspace';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Project workspace',
};

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const user = await validateUserToken();
  const { projectId } = await params;
  const projectIdResult = projectIdSchema.safeParse({ id: projectId });
  if (!projectIdResult.success) notFound();

  const query = parseProjectWorkspaceQuery(await searchParams);
  const workspace = await readProjectWorkspaceForOwner({
    ownerId: user.id!,
    prisma: db,
    projectId: projectIdResult.data.id,
    query,
  });
  if (!workspace) notFound();

  return <ProjectWorkspace initialWorkspace={workspace} />;
}
