import type { OAuthConfig, PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";
import { hasEncryptionKey, seal, unseal } from "./security";
import { oauthProviders, type OAuthProvider } from "./shared";

export const configInputSchema = z.object({
  provider: z.enum(["google", "github"]),
  clientId: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !/\s/.test(value), "Client ID 不能包含空白"),
  clientSecret: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => !/\s/.test(value), "Client Secret 不能包含空白"),
  enabled: z.boolean(),
  clearSecret: z.boolean(),
  revision: z.number().int().nonnegative(),
});
export class OAuthConfigError extends Error {}
export function runtimeConfig(
  row: OAuthConfig | null,
  key: string | undefined,
) {
  if (
    !row?.enabled ||
    !row.clientId ||
    !row.encryptedSecret ||
    !hasEncryptionKey(key)
  )
    return null;
  try {
    const clientSecret = unseal(
      row.encryptedSecret,
      `oauth-config:${row.provider}`,
      key,
    );
    return clientSecret
      ? {
          provider: row.provider,
          clientId: row.clientId,
          clientSecret,
          revision: row.revision,
        }
      : null;
  } catch {
    return null;
  }
}
export async function oauthAvailability(
  db: PrismaClient,
  key: string | undefined,
) {
  const rows = await db.oAuthConfig.findMany();
  return oauthProviders.map((provider) => ({
    provider,
    available: Boolean(
      runtimeConfig(rows.find((row) => row.provider === provider) ?? null, key),
    ),
  }));
}
export async function saveOAuthConfig(
  db: PrismaClient,
  input: z.infer<typeof configInputSchema>,
  adminId: string,
  key: string | undefined,
) {
  const data = configInputSchema.parse(input);
  const current = await db.oAuthConfig.findUnique({
    where: { provider: data.provider },
  });
  if (!current || current.revision !== data.revision)
    throw new OAuthConfigError("配置已更新，请刷新页面后再保存。");
  if (data.clientSecret && !hasEncryptionKey(key))
    throw new OAuthConfigError(
      "服务器尚未设置 OAuth 加密密钥，请配置 OAUTH_ENCRYPTION_KEY。",
    );
  if (
    current.encryptedSecret &&
    data.clientId !== current.clientId &&
    !data.clientSecret &&
    !data.clearSecret
  )
    throw new OAuthConfigError(
      "更换 Client ID 时，请同时填写新的 Client Secret。",
    );
  const encryptedSecret = data.clearSecret
    ? null
    : data.clientSecret
      ? seal(data.clientSecret, `oauth-config:${data.provider}`, key)
      : current.encryptedSecret;
  if (
    data.enabled &&
    !runtimeConfig(
      { ...current, clientId: data.clientId, encryptedSecret, enabled: true },
      key,
    )
  )
    throw new OAuthConfigError(
      "启用前请填写完整的 Client ID 和 Client Secret。",
    );
  const updated = await db.oAuthConfig.updateMany({
    where: { provider: data.provider, revision: data.revision },
    data: {
      clientId: data.clientId,
      encryptedSecret,
      enabled: data.enabled,
      updatedById: adminId,
      revision: { increment: 1 },
    },
  });
  if (updated.count !== 1)
    throw new OAuthConfigError("其他管理员已更新配置，请刷新页面后再保存。");
  return { revision: data.revision + 1, hasSecret: Boolean(encryptedSecret) };
}
export type RuntimeOAuthConfig = NonNullable<ReturnType<typeof runtimeConfig>>;
export function callbackPath(provider: OAuthProvider) {
  return `/api/auth/${provider}/callback`;
}
