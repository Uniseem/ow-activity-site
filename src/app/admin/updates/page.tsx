import { AdminNav } from "@/components/admin-nav";
import { UpdateSettingsForm } from "@/components/update-settings-form";
import { PageHeading } from "@/components/page-heading";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUpdateSettings, settingsView } from "@/lib/updates/service";
export const dynamic = "force-dynamic";
export default async function UpdatesPage() {
  await requireAdmin();
  const settings = settingsView(await getUpdateSettings(prisma));
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="版本管理"
        title="版本更新"
        description="管理员登录后自动检查 GitHub，有新提交时主动提示更新。"
      />
      <AdminNav />
      <UpdateSettingsForm
        initial={settings}
        currentSha={process.env.APP_BUILD_COMMIT || ""}
      />
    </main>
  );
}
