import "./env.config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Use Neon's direct connection for migrations, pooled connections at runtime.
    url: process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim(),
  },
});
