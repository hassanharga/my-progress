'use server';

import { revalidatePath } from 'next/cache';
import { validateUserToken } from '@/helpers/validate-user';
import { projectCreateSchema, projectIdSchema, projectRenameSchema } from '@/schema/project';
import { archiveOwnedProject } from '@/server/tasks/transition-task';

import { paths } from '@/paths';
import { actionClient } from '@/lib/action-client';
import prisma from '@/lib/db';

import type { PrismaClient } from '../../generated/prisma/client';

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
}: {
  clock?: () => Date;
  ownerId: string;
  prisma: PrismaClient;
  projectId: string;
}) => {
  const result = await archiveOwnedProject({ clock, ownerId, prisma: client, projectId });
  if (!result.ok) return result;

  const userData = await client.user.findUnique({
    where: { id: ownerId },
    select: { currentProjectId: true },
  });
  if (userData?.currentProjectId === projectId) {
    const next = await client.project.findFirst({
      where: { ownerId, archived: false, id: { not: projectId } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    await client.user.update({
      where: { id: ownerId },
      data: { currentProjectId: next?.id ?? null },
    });
  }

  return result;
};

export const archiveProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();
  const result = await archiveProjectForOwner({ ownerId: user.id!, prisma, projectId: id });

  if (result.ok) revalidatePath(paths.dashboard);
  return result;
});

export const unarchiveProject = actionClient.inputSchema(projectIdSchema).action(async ({ parsedInput: { id } }) => {
  const user = await validateUserToken();

  const { count } = await prisma.project.updateMany({
    where: { id, ownerId: user.id },
    data: { archived: false, archivedAt: null },
  });

  if (count === 0) throw new Error('Project not found');

  revalidatePath(paths.dashboard);
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
