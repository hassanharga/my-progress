import type { PrismaClient } from '../../generated/prisma/client';
import { readFirstUseForOwner } from '../../src/server/account/read-first-use';

it.each([
  [0, 0, 0],
  [0, 2, 3],
  [1, 0, 0],
  [2, 1, 4],
])(
  'derives first use from owned records: %i active, %i archived, %i tasks',
  async (activeProjectCount, archivedProjectCount, taskCount) => {
    const project = {
      count: jest.fn().mockResolvedValueOnce(activeProjectCount).mockResolvedValueOnce(archivedProjectCount),
    };
    const task = { count: jest.fn().mockResolvedValue(taskCount) };
    const tx = { project, task };
    const prisma = { $transaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaClient;
    expect(await readFirstUseForOwner({ prisma, ownerId: 'owner' })).toEqual({
      activeProjectCount,
      archivedProjectCount,
      taskCount,
    });
    expect(project.count).toHaveBeenNthCalledWith(1, { where: { ownerId: 'owner', archived: false } });
    expect(project.count).toHaveBeenNthCalledWith(2, { where: { ownerId: 'owner', archived: true } });
    expect(task.count).toHaveBeenCalledWith({ where: { userId: 'owner' } });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
  }
);
