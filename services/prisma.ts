/**
 * FILE: services/prisma.ts
 * PURPOSE:
 * Initializes the app's Prisma Client using the pg driver adapter,
 * required by Prisma 7 — a plain `new PrismaClient()` throws at
 * runtime against Postgres without one.
 *
 * Uses DATABASE_URL (Supabase Transaction Pooler, port 6543) for all
 * normal app queries — inserts, updates, deletes, one-off reads from
 * API routes and Server Components. Never DIRECT_URL here; that
 * connection is reserved for the CLI (see prisma.config.mjs).
 *
 * Reused as a singleton in dev so hot-reload doesn't open a new
 * connection pool on every file save.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

// Only cache the client across hot-reloads in development — production
// serverless functions get a fresh client per cold start, which is correct.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
