/**
 * FILE: prisma.config.mjs
 * PURPOSE:
 * Prisma 7 CLI configuration. The CLI (db push, generate, migrate,
 * seed) needs a stable session connection with prepared-statement
 * support, so it always uses DIRECT_URL (Supabase Session Pooler,
 * port 5432) — never the transaction pooler used by the running app.
 *
 * This file is read by `npx prisma` commands only. It has no effect
 * on the app's own runtime Prisma Client (see services/prisma.ts,
 * which uses DATABASE_URL through the pg driver adapter instead).
 */
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
