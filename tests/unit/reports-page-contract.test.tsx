import ReportsPage, { metadata } from '@/app/reports/page';
import { validateUserToken } from '@/helpers/validate-user';
import { readReportingForOwner } from '@/server/reporting/read-reporting';

import db from '@/lib/db';

jest.mock('@/helpers/validate-user', () => ({ validateUserToken: jest.fn() }));
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: { user: { findUnique: jest.fn() }, project: { findMany: jest.fn() } },
}));
jest.mock('@/server/reporting/read-reporting', () => ({ readReportingForOwner: jest.fn() }));
jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

const scope = { from: '2026-09-01', to: '2026-09-28', taskState: 'PAUSED', correctionState: 'CORRECTED' };

describe('Reports page contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(validateUserToken)
      .mockResolvedValue({ id: 'owner-1' } as Awaited<ReturnType<typeof validateUserToken>>);
    jest
      .mocked(db.user.findUnique)
      .mockResolvedValue({ timezone: 'UTC' } as Awaited<ReturnType<typeof db.user.findUnique>>);
  });

  it('authenticates before reading and keeps the route private', async () => {
    jest.mocked(readReportingForOwner).mockResolvedValue(null);
    await expect(ReportsPage({ searchParams: Promise.resolve(scope) })).rejects.toThrow('NOT_FOUND');
    expect(metadata.robots).toEqual({ follow: false, index: false });
    expect(readReportingForOwner).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'owner-1', prisma: db, query: expect.objectContaining({ ...scope, page: 1 }) })
    );
    expect(jest.mocked(validateUserToken).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(db.user.findUnique).mock.invocationCallOrder[0]
    );
  });

  it('hides a foreign project without looking up its name', async () => {
    jest.mocked(readReportingForOwner).mockResolvedValue(null);
    await expect(
      ReportsPage({ searchParams: Promise.resolve({ ...scope, projectId: '11111111-1111-4111-8111-111111111111' }) })
    ).rejects.toThrow('NOT_FOUND');
    expect(db.project.findMany).not.toHaveBeenCalled();
  });

  it('retains invalid input and never reads or enables export', async () => {
    jest.mocked(db.project.findMany).mockResolvedValue([]);
    const view = await ReportsPage({ searchParams: Promise.resolve({ ...scope, from: 'bad-date' }) });
    expect(view.props.values.from).toBe('bad-date');
    expect(view.props.errors.from).toMatch(/date/i);
    expect(readReportingForOwner).not.toHaveBeenCalled();
  });

  it('retains an over-limit range and owned project options without export data', async () => {
    const ownedProjects = [{ id: 'project-1', name: 'Owned', archived: false }];
    jest
      .mocked(db.project.findMany)
      .mockResolvedValue(ownedProjects as Awaited<ReturnType<typeof db.project.findMany>>);
    const view = await ReportsPage({
      searchParams: Promise.resolve({ ...scope, from: '2026-01-15', to: '2026-07-15' }),
    });
    expect(view.props.values).toEqual(expect.objectContaining({ from: '2026-01-15', to: '2026-07-15' }));
    expect(view.props.errors.to).toMatch(/six calendar months/i);
    expect(view.props.ownedProjects).toEqual(ownedProjects);
    expect(view.props.snapshot).toBeUndefined();
    expect(db.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'owner-1' } }));
    expect(readReportingForOwner).not.toHaveBeenCalled();
  });
});
