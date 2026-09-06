import { AiSettingsForm } from "@/components/ai-settings-form";
import { PageHeading } from "@/components/page-heading";
import { Notice } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiSettingsView, getAiSettings } from "@/lib/ai/settings";
import { hasEncryptionKey } from "@/lib/oauth/security";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage() {
  await requirePermission("ai");
  const settings = aiSettingsView(await getAiSettings(prisma));
  return (
    <main className="page-shell">
      <PageHeading
        title="AI 审核"
        description="用 OpenAI 兼容接口接入各家模型。保存 API Key 后选择默认模型，即可让新提交的玩家资料自动审核。"
      />
      {!hasEncryptionKey(process.env.OAUTH_ENCRYPTION_KEY) ? (
        <div className="mb-5">
          <Notice tone="warning">
            服务器尚未设置 OAUTH_ENCRYPTION_KEY，配置后才能加密保存 API Key。
          </Notice>
        </div>
      ) : null}
      <AiSettingsForm initial={settings} />
    </main>
  );
}
