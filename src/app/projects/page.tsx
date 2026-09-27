import type { Metadata } from 'next';
import { validateUserToken } from '@/helpers/validate-user';

import db from '@/lib/db';
import { ProjectsIndex } from '@/components/project-workspace/ProjectsIndex';

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: 'Projects',
};

export default async function ProjectsPage() {
  const user = await validateUserToken();
  const projectRows = await db.project.findMany({
    orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
    select: {
      _count: { select: { tasks: true } },
      archived: true,
      archivedAt: true,
      id: true,
      name: true,
    },
    where: { ownerId: user.id! },
  });

  const projects = projectRows.map(({ _count, ...project }) => ({ ...project, taskCount: _count.tasks }));
  return <ProjectsIndex projects={projects} />;
}
