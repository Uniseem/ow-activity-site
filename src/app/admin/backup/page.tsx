import { BackupManager } from "@/components/backup-manager";
import { PageHeading } from "@/components/page-heading";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function BackupPage() {
  await requireAdmin();
  return <main className="page-shell"><PageHeading title="备份与恢复" description="下载完整网站数据，或从备份迁移到当前站点。" /><BackupManager /></main>;
}
