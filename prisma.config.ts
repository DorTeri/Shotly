import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma reports a `url` that resolves to undefined as "the datasource.url
// property is required", which sends you looking at this file when the real
// problem is an unset environment variable in whatever is running the command.
const url = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

if (!url) {
  throw new Error(
    "DATABASE_URL is not set.\n" +
      "  Locally:    cp .env.example .env && npm run db:up\n" +
      "  Deploying:  add DATABASE_URL (and DIRECT_URL for an unpooled connection)\n" +
      "              to the environment, and make sure it is exposed to the BUILD\n" +
      "              step — `npm run build` runs `prisma migrate deploy` first.",
  );
}

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
  datasource: { url },
});
