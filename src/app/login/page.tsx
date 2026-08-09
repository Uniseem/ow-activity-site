import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="page-shell grid min-h-[calc(100vh-72px)] place-items-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black">登录</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          管理员和玩家使用同一个入口。
        </p>
        <div className="mt-5">
          <AuthForm mode="login" />
        </div>
      </div>
    </main>
  );
}
