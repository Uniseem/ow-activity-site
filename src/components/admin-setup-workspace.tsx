"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AdminSetupForm } from "@/components/admin-setup-form";
import { BackupManager } from "@/components/backup-manager";
import { ButtonLink, Card, Notice } from "@/components/ui";

export function AdminSetupWorkspace({
  encryptionReady,
}: {
  encryptionReady: boolean;
}) {
  const [restored, setRestored] = useState<string[] | null>(null);
  if (restored) {
    return (
      <Card className="mx-auto max-w-lg gap-5 p-6 sm:p-9">
        <Notice tone="success">
          已用备份恢复。管理员账号、密码和第三方登录都按备份写入。
        </Notice>
        <p className="text-sm leading-7">
          请使用这些管理员账号和原密码登录：{restored.join("、")}。
        </p>
        <ButtonLink href="/login?restored=1">去登录</ButtonLink>
      </Card>
    );
  }
  return (
    <div className="mx-auto grid max-w-5xl items-start gap-6 lg:grid-cols-2">
      <Card className="gap-7 p-6 sm:p-9">
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
      <BackupManager
        mode="setup"
        encryptionReady={encryptionReady}
        onRestored={setRestored}
      />
    </div>
  );
}
