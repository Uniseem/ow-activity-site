import "server-only";
import { prisma } from "@/lib/prisma";
import { isD1Database } from "@/lib/database-provider";
import { getAssetBucket, getD1 } from "@/lib/cloudflare";
import { d1Date, newDatabaseId } from "@/lib/d1-atomic";

export async function storeSiteAsset(input: {
  data: Uint8Array<ArrayBuffer>;
  name: string;
  mimeType: string;
  uploadedById: string;
}) {
  if (!isD1Database())
    return prisma.siteAsset.create({ data: input, select: { id: true } });
  const id = newDatabaseId(),
    storageKey = `assets/${id}/${newDatabaseId()}`,
    bucket = getAssetBucket();
  await bucket.put(storageKey, input.data, {
    httpMetadata: { contentType: input.mimeType },
  });
  try {
    await getD1()
      .prepare(
        'INSERT INTO "SiteAsset" ("id","name","mimeType","data","storageKey","byteSize","uploadedById","createdAt") VALUES (?,?,?,X\'\',?,?,?,?)',
      )
      .bind(
        id,
        input.name,
        input.mimeType,
        storageKey,
        input.data.byteLength,
        input.uploadedById,
        d1Date(),
      )
      .run();
  } catch (error) {
    await bucket.delete(storageKey).catch(() => {});
    throw error;
  }
  return { id };
}

export async function readSiteAsset(id: string) {
  if (!isD1Database())
    return prisma.siteAsset.findUnique({
      where: { id },
      select: { data: true, mimeType: true },
    });
  const row = await getD1()
    .prepare(
      'SELECT "storageKey","mimeType","data" FROM "SiteAsset" WHERE "id"=?',
    )
    .bind(id)
    .first<{ storageKey: string | null; mimeType: string; data: number[] }>();
  if (!row) return null;
  if (!row.storageKey)
    return { data: new Uint8Array(row.data), mimeType: row.mimeType };
  const object = await getAssetBucket().get(row.storageKey);
  if (!object) return null;
  return {
    data: new Uint8Array(await object.arrayBuffer()),
    mimeType: row.mimeType,
  };
}
