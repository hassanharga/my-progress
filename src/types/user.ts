import type { User as IUser, Prisma } from '../../generated/prisma/client';

type UserWithRelations = {
  currentProject?: { id: string; name: string } | null;
};

export type User = IUser & UserWithRelations;
export type UserSelect = Prisma.UserSelect;
