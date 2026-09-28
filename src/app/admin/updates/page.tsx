import { UpdateSettingsForm } from "@/components/update-settings-form";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUpdateSettings, settingsView } from "@/lib/updates/service";
export const dynamic = "force-dynamic";
export default async function UpdatesPage() {
  const [, settings] = await Promise.all([
    requirePermission("updates"),
    getUpdateSettings(prisma).then(settingsView),
  ]);
  return (
    <main className="page-shell">
      <PageHeading
        title="版本更新"
        description="管理员登录后自动检查 GitHub，有新提交时主动提示更新。"
      />
      <UpdateSettingsForm
        initial={settings}
        currentSha={process.env.APP_BUILD_COMMIT || ""}
      />
    </main>
  );
}
