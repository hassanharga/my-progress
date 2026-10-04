import type { PrismaClient } from '../../generated/prisma/client';
import { createFirstProjectForOwner } from '../../src/server/account/create-first-project';
import { readTodayForOwner } from '../../src/server/today/read-today';

jest.mock('../../src/server/today/read-today', () => ({ readTodayForOwner: jest.fn() }));
const input = { projectId: 'b7152df8-bbc4-4210-9fa9-7c6f031e2602', name: 'My project' };
const today = { projects: [{ id: input.projectId, name: input.name }], revision: 1 };
const fixture = () => {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'owner' }]),
    project: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(input),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma = { $transaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaClient;
  return { tx, prisma };
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(readTodayForOwner).mockResolvedValue(today as never);
});
it('creates and activates the first project under the owner lock, then reads canonical Today', async () => {
  const { prisma, tx } = fixture();
  expect(await createFirstProjectForOwner({ prisma, ownerId: 'owner', input })).toEqual({
    ok: true,
    data: { projectId: input.projectId, today },
  });
  expect(tx.$queryRaw).toHaveBeenCalled();
  expect(tx.project.create).toHaveBeenCalledWith({ data: { id: input.projectId, name: input.name, ownerId: 'owner' } });
  expect(tx.user.update).toHaveBeenCalledWith({
    where: { id: 'owner' },
    data: { currentProjectId: input.projectId, todayRevision: { increment: 1 } },
  });
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  expect(readTodayForOwner).toHaveBeenCalledWith({ prisma, ownerId: 'owner' });
});
it('reconciles repeated identity without another create or activation', async () => {
  const { prisma, tx } = fixture();
  tx.project.findUnique.mockResolvedValue({
    id: input.projectId,
    name: input.name,
    ownerId: 'owner',
    archived: false,
  } as never);
  expect((await createFirstProjectForOwner({ prisma, ownerId: 'owner', input })).ok).toBe(true);
  expect(tx.project.create).not.toHaveBeenCalled();
  expect(tx.user.update).not.toHaveBeenCalled();
});
it.each([
  { id: input.projectId, name: 'Changed', ownerId: 'owner', archived: false },
  { id: input.projectId, name: input.name, ownerId: 'owner', archived: true },
  { id: input.projectId, name: 'Private name', ownerId: 'foreign', archived: false },
])('does not adopt, rename or restore an existing incompatible identity', async (existing) => {
  const { prisma, tx } = fixture();
  tx.project.findUnique.mockResolvedValue(existing as never);
  const result = await createFirstProjectForOwner({ prisma, ownerId: 'owner', input });
  expect(result).toMatchObject({ ok: false, error: { retryable: false } });
  expect(JSON.stringify(result)).not.toContain('Private name');
  expect(tx.project.create).not.toHaveBeenCalled();
  expect(tx.user.update).not.toHaveBeenCalled();
});
it('returns owner canonical conflict when another active project exists', async () => {
  const { prisma, tx } = fixture();
  tx.project.findFirst.mockResolvedValue({ id: 'existing' } as never);
  expect(await createFirstProjectForOwner({ prisma, ownerId: 'owner', input })).toMatchObject({
    ok: false,
    canonical: { projectId: 'existing', today },
    error: { code: 'CONFLICT', retryable: false },
  });
  expect(tx.project.findFirst).toHaveBeenCalledWith({
    where: { ownerId: 'owner', archived: false },
    select: { id: true },
  });
  expect(tx.project.create).not.toHaveBeenCalled();
});
it('never writes for a missing owner', async () => {
  const { prisma, tx } = fixture();
  tx.$queryRaw.mockResolvedValue([]);
  expect(await createFirstProjectForOwner({ prisma, ownerId: 'owner', input })).toMatchObject({
    ok: false,
    error: { code: 'NOT_FOUND', retryable: false },
  });
  expect(tx.project.create).not.toHaveBeenCalled();
  expect(readTodayForOwner).not.toHaveBeenCalled();
});
it('rejects invalid direct input before a transaction', async () => {
  const { prisma } = fixture();
  expect(await createFirstProjectForOwner({ prisma, ownerId: 'owner', input: { ...input, name: ' ' } })).toMatchObject({
    ok: false,
    error: { code: 'VALIDATION_ERROR' },
  });
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it('returns a sanitized retryable failure after an uncertain commit/readback', async () => {
  const { prisma } = fixture();
  jest.mocked(readTodayForOwner).mockRejectedValue(new Error('private connection details'));
  const result = await createFirstProjectForOwner({ prisma, ownerId: 'owner', input });
  expect(result).toMatchObject({ ok: false, error: { retryable: true } });
  expect(JSON.stringify(result)).not.toContain('private connection details');
});
it('retries serialization once, but does not loop indefinitely', async () => {
  const { prisma, tx } = fixture();
  tx.project.create.mockRejectedValue({ code: 'P2034' });
  expect(await createFirstProjectForOwner({ prisma, ownerId: 'owner', input })).toMatchObject({
    ok: false,
    error: { retryable: true },
  });
  expect(prisma.$transaction).toHaveBeenCalledTimes(2);
});
