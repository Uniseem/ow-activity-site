"use server";

import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/admin-permissions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listOpenAiModels, AiClientError } from "@/lib/ai/openai-compatible";
import {
  aiSettingsInputSchema,
  AiSettingsError,
  getAiSettings,
  runtimeAiSettings,
  saveAiSettings,
} from "@/lib/ai/settings";
import { pageOAuthOrigin } from "@/lib/oauth/server";

export type AiSettingsResult = {
  ok: boolean;
  message: string;
  revision: number;
  hasKey: boolean;
  preset: string;
  baseUrl: string;
  model: string;
  autoReview: boolean;
};

export async function saveAiSettingsAction(
  previous: AiSettingsResult,
  formData: FormData,
): Promise<AiSettingsResult> {
  const admin = await requireAdmin();
  if (!hasPermission(admin, "ai"))
    return { ...previous, ok: false, message: "没有 AI 审核设置权限。" };
  const parsed = aiSettingsInputSchema.safeParse({
    preset: formData.get("preset"),
    baseUrl: formData.get("baseUrl"),
    apiKey: formData.get("apiKey"),
    model: formData.get("model"),
    autoReview: formData.get("autoReview") === "on",
    clearKey: formData.get("clearKey") === "on",
    revision: Number(formData.get("revision")),
  });
  if (!parsed.success)
    return {
      ...previous,
      ok: false,
      message: parsed.error.issues[0]?.message ?? "配置内容不正确。",
    };
  try {
    const saved = await saveAiSettings(
      prisma,
      parsed.data,
      admin.id,
      process.env.OAUTH_ENCRYPTION_KEY,
    );
    revalidatePath("/admin/ai");
    return {
      ...saved,
      ok: true,
      message: saved.autoReview
        ? "已保存。新提交的玩家资料会交给默认模型自动审核。"
        : "已保存。自动审核保持关闭，资料仍由管理员处理。",
    };
  } catch (error) {
    return {
      ...previous,
      ok: false,
      message:
        error instanceof AiSettingsError
          ? error.message
          : "保存失败，请稍后重试。",
    };
  }
}

export async function listAiModelsAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string; models: string[] }> {
  const admin = await requireAdmin();
  if (!hasPermission(admin, "ai"))
    return { ok: false, message: "没有 AI 审核设置权限。", models: [] };
  const typedKey = String(formData.get("apiKey") ?? "").trim();
  const typedUrl = String(formData.get("baseUrl") ?? "").trim();
  const row = await getAiSettings(prisma);
  const runtime = runtimeAiSettings(row, process.env.OAUTH_ENCRYPTION_KEY);
  const baseUrl = typedUrl || runtime?.baseUrl || row.baseUrl;
  const apiKey = typedKey || runtime?.apiKey || "";
  if (!baseUrl || !apiKey)
    return {
      ok: false,
      message: "请先填写接口地址和 API Key，或先保存后再拉取模型。",
      models: [],
    };
  try {
    const models = await listOpenAiModels({
      baseUrl,
      apiKey,
      origin: await pageOAuthOrigin(),
    });
    return { ok: true, message: `已拉取 ${models.length} 个模型。`, models };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof AiClientError || error instanceof Error
          ? error.message
          : "拉取模型失败。",
      models: [],
    };
  }
}
