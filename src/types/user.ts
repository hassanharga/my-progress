import type { User as IUser, Prisma } from '../../generated/prisma/client';

type UserWithRelations = {
  currentProject?: { id: string; name: string } | null;
};

export type User = IUser & UserWithRelations;
export type UserSelect = Prisma.UserSelect;

export type AccountProfile = Pick<
  IUser,
  'id' | 'name' | 'email' | 'currentProjectId' | 'weekStartDay' | 'timezone' | 'dailyCapacityMinutes'
> & { currentProject: { id: string; name: string } | null };
