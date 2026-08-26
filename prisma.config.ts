import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Only the CLI (migrate, db push, studio) reads this. The running app connects
  // through src/lib/prisma.ts. Locally there is no pooler, so DIRECT_URL just
  // mirrors DATABASE_URL; in production point DATABASE_URL at the pooled
  // connection and DIRECT_URL at the unpooled one, because migrations take
  // advisory locks that transaction-mode poolers don't hold reliably.
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
