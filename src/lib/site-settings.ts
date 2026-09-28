import "server-only";
import { cache } from "react";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  createSiteText,
  defaultSiteConfiguration,
  validateSiteConfiguration,
} from "@/lib/site-config";

export const getSiteSettings = cache(async () => {
  if (!isDatabaseConfigured())
    return {
      configuration: defaultSiteConfiguration,
      revision: 0,
      updatedAt: null,
    };
  const row = await prisma.siteSettings.findUnique({ where: { id: "site" } });
  return {
    configuration: row
      ? validateSiteConfiguration(row.values)
      : defaultSiteConfiguration,
    revision: row?.revision ?? 0,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
});
export async function getSiteText() {
  return createSiteText((await getSiteSettings()).configuration);
}
