import type { AccountProfile } from '@/types/user';

import type { Prisma } from '../../../generated/prisma/client';

export const accountProfileSelect = {
  id: true,
  name: true,
  email: true,
  currentProjectId: true,
  currentProject: { select: { id: true, name: true } },
  weekStartDay: true,
  timezone: true,
  dailyCapacityMinutes: true,
} satisfies Prisma.UserSelect;

export const toAccountProfile = (profile: AccountProfile): AccountProfile => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  currentProjectId: profile.currentProjectId,
  currentProject: profile.currentProject ? { id: profile.currentProject.id, name: profile.currentProject.name } : null,
  weekStartDay: profile.weekStartDay,
  timezone: profile.timezone,
  dailyCapacityMinutes: profile.dailyCapacityMinutes,
});
