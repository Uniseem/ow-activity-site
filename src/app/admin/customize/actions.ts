"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSiteConfiguration } from "@/lib/site-config";
import { validateSiteAsset } from "@/lib/site-asset";
import { Prisma } from "@/generated/prisma/client";
import { storeSiteAsset } from "@/lib/asset-storage";

export type SaveSiteResult = {
  ok: boolean;
  message: string;
  revision?: number;
};
export async function saveSiteSettingsAction(
  _state: SaveSiteResult,
  formData: FormData,
): Promise<SaveSiteResult> {
  const admin = await requireAdmin();
  const raw = formData.get("configuration");
  const revision = Number(formData.get("revision"));
  if (
    typeof raw !== "string" ||
    raw.length > 500_000 ||
    !Number.isSafeInteger(revision) ||
    revision < 0
  )
    return { ok: false, message: "配置内容无效或过大，请刷新页面后重试。" };
  let configuration;
  try {
    configuration = validateSiteConfiguration(JSON.parse(raw));
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof SyntaxError
          ? "配置格式有误。"
          : error instanceof Error
            ? error.message
            : "配置格式有误。",
    };
  }
  try {
    if (revision === 0) {
      await prisma.siteSettings.create({
        data: {
          id: "site",
          values: configuration,
          revision: 1,
          updatedById: admin.id,
        },
      });
    } else {
      const result = await prisma.siteSettings.updateMany({
        where: { id: "site", revision },
        data: {
          values: configuration,
          revision: { increment: 1 },
          updatedById: admin.id,
        },
      });
      if (!result.count)
        return {
          ok: false,
          message: "其他管理员已更新设置。请先刷新页面，再重新应用你的修改。",
        };
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return { ok: false, message: "其他管理员已更新设置。请刷新页面后重试。" };
    console.error("Saving site settings failed", error);
    return {
      ok: false,
      message: "保存失败，请稍后重试。你的修改仍保留在当前页面。",
    };
  }
  revalidatePath("/", "layout");
  return {
    ok: true,
    revision: revision + 1,
    message: "站点设置已保存，刷新页面即可看到最新内容。",
  };
}
export async function uploadSiteAssetAction(
  formData: FormData,
): Promise<{ url?: string; error?: string; authRequired?: boolean }> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN" || admin.status !== "APPROVED") {
    return {
      error:
        "登录已失效或当前账号没有管理员权限，请重新登录后上传。当前填写内容已保留。",
      authRequired: true,
    };
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "请选择图片。" };
  try {
    const data = await validateSiteAsset(file);
    const asset = await storeSiteAsset({
      data,
      name: file.name.slice(0, 200),
      mimeType: file.type,
      uploadedById: admin.id,
    });
    return { url: "/api/site-assets/" + asset.id };
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message.startsWith("图片")
          ? error.message
          : "图片上传失败，请稍后重试。",
    };
  }
}
