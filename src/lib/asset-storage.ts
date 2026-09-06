import "server-only";
import { prisma } from "@/lib/prisma";

export async function storeSiteAsset(input: {
  data: Uint8Array<ArrayBuffer>;
  name: string;
  mimeType: string;
  uploadedById: string;
}) {
  return prisma.siteAsset.create({ data: input, select: { id: true } });
}

export async function readSiteAsset(id: string) {
  return prisma.siteAsset.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });
}
