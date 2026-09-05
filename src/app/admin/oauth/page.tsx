import { OAuthSettingsForm } from "@/components/oauth-settings-form";
import { PageHeading } from "@/components/page-heading";
import { Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callbackPath } from "@/lib/oauth/config";
import { hasEncryptionKey } from "@/lib/oauth/security";
import { pageOAuthOrigin } from "@/lib/oauth/server";
import { oauthProviders } from "@/lib/oauth/shared";

export const dynamic = "force-dynamic";
export default async function OAuthSettingsPage() {
  await requireAdmin();
  const [rows, origin] = await Promise.all([
    prisma.oAuthConfig.findMany(),
    pageOAuthOrigin(),
  ]);
  return (
    <main className="page-shell">
      <PageHeading
        title="第三方登录"
        description="填写各平台的 OAuth 应用信息并启用后，登录页对应按钮才可使用。"
      />
      {!hasEncryptionKey(process.env.OAUTH_ENCRYPTION_KEY) ? (
        <div className="mb-5">
          <Notice tone="warning">
            服务器尚未设置 OAUTH_ENCRYPTION_KEY，配置后才能加密保存客户端密钥。
          </Notice>
        </div>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {oauthProviders.map((provider) => {
          const row = rows.find((item) => item.provider === provider);
          return (
            <OAuthSettingsForm
              key={provider}
              initial={{
                provider,
                clientId: row?.clientId ?? "",
                hasSecret: Boolean(row?.encryptedSecret),
                enabled: row?.enabled ?? false,
                revision: row?.revision ?? 0,
              }}
              callbackUrl={origin + callbackPath(provider)}
            />
          );
        })}
      </div>
    </main>
  );
}
