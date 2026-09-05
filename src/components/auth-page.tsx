import { Crosshair, ShieldCheck, Users, CalendarDays } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { Card, Notice } from "@/components/ui";
import { OAuthButtons } from "@/components/oauth-buttons";
import { getOAuthAvailability } from "@/lib/oauth/server";
import { oauthMessages } from "@/lib/oauth/shared";
import { getSiteText } from "@/lib/site-settings";

export async function AuthPage({
  mode,
  oauthCode,
}: {
  mode: "login" | "register";
  oauthCode?: string;
}) {
  const isLogin = mode === "login";
  const providers = await getOAuthAvailability();
  const t = await getSiteText();
  return (
    <main className="page-shell auth-shell">
      <section className="auth-pitch">
        <span className="icon-tile">
          <Crosshair size={24} />
        </span>
        <p className="eyebrow mt-6">Find your team</p>
        <h1>
          {isLogin ? (
            <>
              欢迎回来，
              <br />
              你的队友在这里。
            </>
          ) : (
            <>
              下一场精彩，
              <br />
              从认识你开始。
            </>
          )}
        </h1>
        <p className="max-w-sm text-sm leading-7 text-muted">
          从周末内战到随心开黑，找到合拍的队友，一起享受守望先锋。
        </p>
        <div className="auth-benefits mt-8 grid gap-5 text-sm">
          {[
            {
              icon: Users,
              title: "认识玩家",
              description: "用昵称与宣言，让队友记住你。",
            },
            {
              icon: CalendarDays,
              title: "参加活动",
              description: "发现内战、训练和娱乐组队。",
            },
            {
              icon: ShieldCheck,
              title: "安心加入",
              description: "资料和报名由管理员审核。",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3">
              <Icon size={18} className="mt-1 text-accent" />
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-xs text-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Card className="auth-form-card">
        <div>
          <h2 className="text-2xl font-semibold">
            {isLogin ? "登录账号" : "加入" + t("brand.name")}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {isLogin
              ? "继续你的社区活动之旅。"
              : "创建账号，完善资料后即可等待审核。"}
          </p>
        </div>
        {oauthCode && oauthMessages[oauthCode] ? (
          <Notice tone="warning">{oauthMessages[oauthCode]}</Notice>
        ) : null}
        <OAuthButtons providers={providers} />
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-separator" />
          或使用用户名和密码
          <span className="h-px flex-1 bg-separator" />
        </div>
        <AuthForm mode={mode} />
      </Card>
    </main>
  );
}
