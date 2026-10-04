'use server';

import { revalidatePath } from 'next/cache';
import { validateUserToken } from '@/helpers/validate-user';
import { createFirstProjectSchema, projectCreateSchema, projectIdSchema, projectRenameSchema } from '@/schema/project';
import { createFirstProjectForOwner } from '@/server/account/create-first-project';
import { mutateProjectWorkspaceLifecycleForOwner } from '@/server/projects/mutate-project-workspace';
import type { ProjectWorkspaceQuery } from '@/server/projects/project-workspace-types';

import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';

import type { PrismaClient } from '../../generated/prisma/client';

const defaultWorkspaceQuery: ProjectWorkspaceQuery = { query: '', state: null, taskId: null };

export const createFirstProject = actionClient.inputSchema(createFirstProjectSchema).action(async ({ parsedInput }) => {
  const { id } = await validateUserToken();
  if (!id) throw new Error('Account unavailable.');
  const result = await createFirstProjectForOwner({ prisma, ownerId: id, input: parsedInput });
  if (result.ok || result.canonical) {
    for (const path of [paths.dashboard, paths.projects, paths.settings]) revalidatePath(path);
  }
  return result;
});

export const createProject = actionClient.inputSchema(projectCreateSchema).action(async ({ parsedInput: { name } }) => {
  const user = await validateUserToken();

  const project = await prisma.project.create({
    data: { name, ownerId: user.id! },
  });

  // Auto-activate if the user has no active project yet (first project)
  await prisma.user.updateMany({
    where: { id: user.id!, currentProjectId: null },
    data: { currentProjectId: project.id },
  });

  revalidatePath(paths.dashboard);
  return { id: project.id, name: project.name };
});

export const renameProject = actionClient
  .inputSchema(projectRenameSchema)
  .action(async ({ parsedInput: { id, name } }) => {
    const user = await validateUserToken();

    const { count } = await prisma.project.updateMany({
      where: { id, ownerId: user.id },
      data: { name },
    });

    if (count === 0) throw new Error('Project not found');

    revalidatePath(paths.dashboard);
  });

export const archiveProjectForOwner = async ({
  clock,
  ownerId,
  prisma: client,
  projectId,
  query = defaultWorkspaceQuery,
}: {
  clock?: () => Date;
  ownerId: string;
  prisma: PrismaClient;
  projectId: string;
  query?: ProjectWorkspaceQuery;
}) => {
  return mutateProjectWorkspaceLifecycleForOwner({
    clock,
    mutation: { projectId, type: 'ARCHIVE' },
    ownerId,
    prisma: client,
    query,
  });
};

export const archiveProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();
  const result = await archiveProjectForOwner({ ownerId: user.id!, prisma, projectId: id });

  if (result.ok) {
    revalidatePath(paths.dashboard);
    revalidatePath(`/projects/${id}`);
  }
  return result;
});

export const unarchiveProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();
  const result = await mutateProjectWorkspaceLifecycleForOwner({
    mutation: { projectId: id, type: 'RESTORE' },
    ownerId: user.id!,
    prisma,
    query: defaultWorkspaceQuery,
  });

  if (result.ok) {
    revalidatePath(paths.dashboard);
    revalidatePath(`/projects/${id}`);
  }
  return result;
});

export const switchProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();

  // Validate ownership and that it isn't archived
  const project = await prisma.project.findFirst({
    where: { id, ownerId: user.id, archived: false },
    select: { id: true },
  });
  if (!project) throw new Error('Project not found or archived');

  await prisma.user.update({
    where: { id: user.id! },
    data: { currentProjectId: id },
  });

  revalidatePath(paths.dashboard);
});

export type ProjectListItem = {
  id: string;
  name: string;
  archived: boolean;
  archivedAt: Date | null;
  taskCount: number;
};

export const getProjects = actionClient.action(async () => {
  const user = await validateUserToken();

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    orderBy: [{ archived: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      archived: true,
      archivedAt: true,
      _count: { select: { tasks: true } },
    },
  });

  return projects.map(({ _count, ...p }) => ({
    ...p,
    taskCount: _count.tasks,
  })) satisfies ProjectListItem[];
});
