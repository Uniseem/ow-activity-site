import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminSetupWorkspace } from "@/components/admin-setup-workspace";
import { Card } from "@/components/ui";
import { canSetUpAdmin } from "@/lib/admin-setup";
import { hasEncryptionKey } from "@/lib/oauth/security";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  if (!isDatabaseConfigured()) {
    return (
      <main className="page-shell">
        <Card className="mx-auto max-w-lg gap-7 p-6 sm:p-9">
          <div>
            <span className="icon-tile">
              <ShieldCheck size={24} />
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight">
              还不能注册管理员
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              这个本地预览没有连接数据库，首次管理员注册不会打开。请打开已经部署并配好数据库的站点，访问{" "}
              <code>/admin</code>。
            </p>
          </div>
        </Card>
      </main>
    );
  }

  if (!(await canSetUpAdmin(prisma))) redirect("/admin");

  return (
    <main className="page-shell">
      <AdminSetupWorkspace
        encryptionReady={hasEncryptionKey(process.env.OAUTH_ENCRYPTION_KEY)}
      />
    </main>
  );
}
