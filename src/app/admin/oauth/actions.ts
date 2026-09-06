"use server";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/admin-permissions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  configInputSchema,
  OAuthConfigError,
  saveOAuthConfig,
} from "@/lib/oauth/config";

export type OAuthSettingsResult = {
  ok: boolean;
  message: string;
  revision: number;
  hasSecret: boolean;
  enabled: boolean;
};
export async function saveOAuthSettingsAction(
  previous: OAuthSettingsResult,
  formData: FormData,
): Promise<OAuthSettingsResult> {
  const admin = await requireAdmin();
  if (!hasPermission(admin, "oauth"))
    return { ...previous, ok: false, message: "没有第三方登录设置权限。" };
  const parsed = configInputSchema.safeParse({
    provider: formData.get("provider"),
    clientId: formData.get("clientId"),
    clientSecret: formData.get("clientSecret"),
    enabled: formData.get("enabled") === "on",
    clearSecret: formData.get("clearSecret") === "on",
    revision: Number(formData.get("revision")),
  });
  if (!parsed.success)
    return {
      ...previous,
      ok: false,
      message: parsed.error.issues[0]?.message ?? "配置内容不正确。",
    };
  try {
    const result = await saveOAuthConfig(
      prisma,
      parsed.data,
      admin.id,
      process.env.OAUTH_ENCRYPTION_KEY,
    );
    revalidatePath("/admin/oauth");
    revalidatePath("/login");
    revalidatePath("/register");
    revalidatePath("/me");
    return {
      ...result,
      enabled: parsed.data.enabled,
      ok: true,
      message: parsed.data.enabled
        ? "已保存并启用，登录页面立即生效。"
        : "已保存，当前登录方式保持关闭。",
    };
  } catch (error) {
    return {
      ...previous,
      ok: false,
      message:
        error instanceof OAuthConfigError
          ? error.message
          : "保存失败，请稍后重试。",
    };
  }
}
