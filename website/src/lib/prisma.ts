import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Single shared client + adapter for the whole app (NextAuth route AND
// every API route below). Previously the NextAuth route created its own
// PrismaClient locally - that's fine for one file, but the new
// /api/conversations routes need the same client, and creating a second
// one would open a second connection pool. Centralizing it here also
// keeps the existing dev-hot-reload-safe singleton pattern.
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
