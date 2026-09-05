import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export type SiteCloudflareEnv = {
  DB: D1Database;
  SITE_ASSETS: R2Bucket;
};

export function getCloudflareBindings(): SiteCloudflareEnv {
  return getCloudflareContext().env as unknown as SiteCloudflareEnv;
}

export function getD1() {
  const db = getCloudflareBindings().DB;
  if (!db)
    throw new Error(
      "数据库还没有配置。请绑定 Cloudflare D1 的 DB 并应用迁移。",
    );
  return db;
}

export function getAssetBucket() {
  const bucket = getCloudflareBindings().SITE_ASSETS;
  if (!bucket) throw new Error("尚未绑定 Cloudflare R2 的 SITE_ASSETS。");
  return bucket;
}
