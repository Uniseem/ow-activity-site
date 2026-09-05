import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminSetupForm } from "@/components/admin-setup-form";
import { Card } from "@/components/ui";
import { canSetUpAdmin } from "@/lib/admin-setup";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  if (!isDatabaseConfigured() || !(await canSetUpAdmin(prisma)))
    redirect("/admin");

  return (
    <main className="page-shell">
      <Card className="mx-auto max-w-lg gap-7 p-6 sm:p-9">
        <div>
          <span className="icon-tile">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            创建首位管理员
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted">
            欢迎来到管理后台。第一个完成注册的账号将成为管理员，可以管理活动、审核报名和修改站点设置。
          </p>
          <p className="mt-2 text-sm leading-7 text-muted">
            注册成功后，此入口自动关闭。
          </p>
        </div>
        <AdminSetupForm />
      </Card>
    </main>
  );
}
