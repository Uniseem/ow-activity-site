import { z } from "zod";
import type { AiSettings, PrismaClient } from "@/generated/prisma/client";
import { hasEncryptionKey, seal, unseal } from "@/lib/oauth/security";
import { isAiPresetId, parseAiBaseUrl, presetBaseUrl } from "./presets";

export const AI_SETTINGS_ID = "review";
export const AI_KEY_CONTEXT = "ai-settings:review";

export class AiSettingsError extends Error {}

export const aiSettingsInputSchema = z.object({
  preset: z.string().refine(isAiPresetId, "请选择接口渠道。"),
  baseUrl: z.string().trim().max(500),
  apiKey: z
    .string()
    .trim()
    .max(4000)
    .refine((value) => !/\s/.test(value), "API Key 不能包含空白"),
  model: z
    .string()
    .trim()
    .max(200)
    .refine((value) => !/\s/.test(value), "模型名称不能包含空白"),
  autoReview: z.boolean(),
  clearKey: z.boolean(),
  revision: z.number().int().nonnegative(),
});

export type AiSettingsView = {
  preset: string;
  baseUrl: string;
  model: string;
  autoReview: boolean;
  revision: number;
  hasKey: boolean;
};

export function aiSettingsView(row: AiSettings): AiSettingsView {
  return {
    preset: row.preset,
    baseUrl: row.baseUrl,
    model: row.model,
    autoReview: row.autoReview,
    revision: row.revision,
    hasKey: Boolean(row.encryptedApiKey),
  };
}

export async function getAiSettings(db: PrismaClient) {
  const existing = await db.aiSettings.findUnique({
    where: { id: AI_SETTINGS_ID },
  });
  if (existing) return existing;
  try {
    return await db.aiSettings.create({ data: { id: AI_SETTINGS_ID } });
  } catch {
    const raced = await db.aiSettings.findUnique({
      where: { id: AI_SETTINGS_ID },
    });
    if (raced) return raced;
    throw new AiSettingsError("无法读取 AI 审核设置。");
  }
}

export function runtimeAiSettings(
  row: AiSettings | null,
  key: string | undefined,
) {
  if (!row?.encryptedApiKey || !row.baseUrl.trim() || !row.model.trim())
    return null;
  if (!hasEncryptionKey(key)) return null;
  try {
    const apiKey = unseal(row.encryptedApiKey, AI_KEY_CONTEXT, key);
    return apiKey
      ? {
          baseUrl: parseAiBaseUrl(row.baseUrl),
          apiKey,
          model: row.model,
          autoReview: row.autoReview,
        }
      : null;
  } catch {
    return null;
  }
}

export async function saveAiSettings(
  db: PrismaClient,
  input: z.infer<typeof aiSettingsInputSchema>,
  adminId: string,
  key: string | undefined,
) {
  const data = aiSettingsInputSchema.parse(input);
  const current = await getAiSettings(db);
  if (current.revision !== data.revision)
    throw new AiSettingsError("设置已被其他管理员修改，请刷新后重试。");
  let baseUrl: string;
  try {
    baseUrl = parseAiBaseUrl(data.baseUrl || presetBaseUrl(data.preset));
  } catch (error) {
    throw new AiSettingsError(
      error instanceof Error ? error.message : "接口地址不正确。",
    );
  }
  if (data.apiKey && !hasEncryptionKey(key))
    throw new AiSettingsError(
      "服务器尚未设置 OAUTH_ENCRYPTION_KEY，无法加密保存 API Key。",
    );
  const encryptedApiKey = data.clearKey
    ? null
    : data.apiKey
      ? seal(data.apiKey, AI_KEY_CONTEXT, key)
      : current.encryptedApiKey;
  if (data.autoReview && (!encryptedApiKey || !data.model))
    throw new AiSettingsError("开启自动审核前，请先保存 API Key 并选择默认模型。");
  const updated = await db.aiSettings.updateMany({
    where: { id: AI_SETTINGS_ID, revision: data.revision },
    data: {
      preset: data.preset,
      baseUrl,
      encryptedApiKey,
      model: data.model,
      autoReview: data.autoReview,
      updatedById: adminId,
      revision: { increment: 1 },
    },
  });
  if (updated.count !== 1)
    throw new AiSettingsError("其他管理员已更新配置，请刷新后再保存。");
  return {
    revision: data.revision + 1,
    hasKey: Boolean(encryptedApiKey),
    preset: data.preset,
    baseUrl,
    model: data.model,
    autoReview: data.autoReview,
  };
}
