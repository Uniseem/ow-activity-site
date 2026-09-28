"use server";
import { z } from "zod";
import { hasPermission } from "@/lib/admin-permissions";
import { revalidateAdminUpdates } from "@/lib/revalidate-site";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpdateSettings } from "@/lib/updates/service";
import { UpdateError, type UpdateSettingsView } from "@/lib/updates/shared";
export type UpdateSettingsResult = {
  ok: boolean;
  message: string;
  settings: UpdateSettingsView;
};
export async function saveUpdateSettingsAction(
  previous: UpdateSettingsResult,
  form: FormData,
): Promise<UpdateSettingsResult> {
  const admin = await requireAdmin();
  if (!hasPermission(admin, "updates"))
    return { ...previous, ok: false, message: "没有版本更新权限。" };
  const input = z
    .object({
      repositoryUrl: z.string().max(300),
      branch: z.string().max(200),
      deployHook: z.string().max(1000),
      revision: z.number().int().nonnegative(),
      clearDeployHook: z.boolean(),
      hasDeployHook: z.boolean(),
    })
    .safeParse({
      repositoryUrl: form.get("repositoryUrl"),
      branch: form.get("branch"),
      deployHook: form.get("deployHook"),
      revision: Number(form.get("revision")),
      clearDeployHook: form.get("clearDeployHook") === "on",
      hasDeployHook: false,
    });
  if (!input.success)
    return { ...previous, ok: false, message: "请检查设置内容。" };
  try {
    const settings = await saveUpdateSettings(
      prisma,
      input.data,
      admin.id,
      process.env.OAUTH_ENCRYPTION_KEY,
    );
    revalidateAdminUpdates();
    return {
      ok: true,
      message: "设置已保存，将按新的仓库配置检查更新。",
      settings,
    };
  } catch (error) {
    return {
      ...previous,
      ok: false,
      message:
        error instanceof UpdateError ? error.message : "保存失败，请稍后重试。",
    };
  }
}
