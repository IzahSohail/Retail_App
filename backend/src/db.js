// Import @prisma/client in a way compatible with CommonJS-built package
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

export const prisma = new PrismaClient();


