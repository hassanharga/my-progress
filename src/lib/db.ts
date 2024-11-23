import { PrismaClient } from '@prisma/client';

import { config } from '@/config';

const prismaClientSingleton = (): PrismaClient => {
  return new PrismaClient({ log: config.site.isProduction ? ['query'] : [] });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
