import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

function gitValue(args: string[]) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}
const buildCommit =
  process.env.APP_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  gitValue(["rev-parse", "HEAD"]);

const isD1Build = process.env.DATABASE_PROVIDER === "d1";
const emptyNodeModule = "./src/lib/empty-node-module.ts";
const pgAliases = {
  pg: emptyNodeModule,
  "pg-cloudflare": emptyNodeModule,
  "@prisma/adapter-pg": emptyNodeModule,
};

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  // Keep Prisma native/wasm clients out of the Next bundle. D1 is loaded only
  // when DATABASE_PROVIDER=d1, so Vercel/Node builds should not ship that wasm.
  // Cloudflare must not copy `pg`; OpenNext would then fail on optional
  // `pg-cloudflare` and pull a Node PostgreSQL driver into the Worker.
  serverExternalPackages: isD1Build
    ? ["@prisma/adapter-d1", "@prisma/client"]
    : ["@prisma/adapter-d1", "@prisma/adapter-pg", "@prisma/client", "pg"],
  ...(isD1Build
    ? {
        outputFileTracingExcludes: {
          "*": [
            "node_modules/pg/**",
            "node_modules/pg-*/**",
            "node_modules/@prisma/adapter-pg/**",
          ],
        },
        turbopack: { resolveAlias: pgAliases },
        webpack: (config) => {
          const empty = join(process.cwd(), "src/lib/empty-node-module.ts");
          config.resolve ??= {};
          const current = config.resolve.alias;
          if (Array.isArray(current)) {
            config.resolve.alias = [
              { name: "pg", alias: empty },
              { name: "pg-cloudflare", alias: empty },
              { name: "@prisma/adapter-pg", alias: empty },
              ...current,
            ];
          } else {
            config.resolve.alias = {
              ...(typeof current === "object" && current ? current : {}),
              pg: empty,
              "pg-cloudflare": empty,
              "@prisma/adapter-pg": empty,
            };
          }
          return config;
        },
      }
    : {}),
  // 固定在构建产物里，不能用远端最新提交冒充当前部署版本。
  env: {
    APP_BUILD_COMMIT: /^[a-f0-9]{40}$/i.test(buildCommit)
      ? buildCommit.toLowerCase()
      : "",
  },
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default async function configureNext(phase: string) {
  if (process.env.DATABASE_PROVIDER === "d1" && phase === PHASE_DEVELOPMENT_SERVER) {
    const { initOpenNextCloudflareForDev } = await import("@opennextjs/cloudflare");
    await initOpenNextCloudflareForDev();
  }
  return nextConfig;
}
