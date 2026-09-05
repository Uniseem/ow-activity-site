import { loadEnvConfig } from "@next/env";

// Prisma CLI and seed scripts use the same .env files as Next.js.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
