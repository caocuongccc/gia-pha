import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Singleton pattern — tránh tạo nhiều connection trong serverless warm reuse
export const prisma = global.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
