import { PageHeading } from "@/components/page-heading";
import { SiteEditor } from "@/components/site-editor";
import { requireAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export default async function CustomizePage() {
  await requireAdmin();
  const settings = await getSiteSettings();
  return (
    <main className="page-shell">
      <PageHeading
        title="站点设置"
        description="设置站点名称、品牌图片和首页介绍。"
      />
      <SiteEditor
        initial={settings.configuration}
        revision={settings.revision}
      />
    </main>
  );
}
