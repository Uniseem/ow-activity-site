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
  const [providers, t] = await Promise.all([
    getOAuthAvailability(),
    getSiteText(),
  ]);
  const isLogin = mode === "login";
  return (
    <main className="page-shell auth-shell">
      <div className="auth-heading">
        <h1>{isLogin ? "登录" : "注册账号"}</h1>
        <p>
          {isLogin ? t("brand.name") : "填写基本资料，审核通过后即可报名活动。"}
        </p>
      </div>
      <Card className="auth-form-card">
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
