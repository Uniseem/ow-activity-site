import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="page-shell grid min-h-[calc(100vh-72px)] place-items-center">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-black">注册</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          注册后进入待审核状态，公开卡片通过后才会展示。
        </p>
        <div className="mt-5">
          <AuthForm mode="register" />
        </div>
      </div>
    </main>
  );
}
