"use client";

import { Lock, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { loginAction, registerAction, type FormState } from "@/app/actions";

type AuthFormProps = {
  mode: "login" | "register";
};

const initialState: FormState = { message: "" };

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isLogin = mode === "login";

  return (
    <form
      action={formAction}
      className="grid gap-4 rounded-md border border-black/10 bg-white p-5 shadow-sm"
    >
      <label className="grid gap-2 text-sm font-semibold">
        用户名（登录用：英文、数字、下划线，3–24 位）
        <input
          className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base font-normal"
          name="username"
          autoComplete="username"
          minLength={isLogin ? undefined : 3}
          maxLength={isLogin ? undefined : 24}
          pattern={isLogin ? undefined : "[A-Za-z0-9_]{3,24}"}
          required
        />
        {state.errors?.username ? (
          <span className="text-xs text-[var(--red)]">
            {state.errors.username[0]}
          </span>
        ) : null}
      </label>

      {!isLogin ? (
        <>
          <label className="grid gap-2 text-sm font-semibold">
            公开昵称（2–20 个字符，可用中文）
            <input
              className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base font-normal"
              name="displayName"
              minLength={2}
              maxLength={20}
              required
            />
            {state.errors?.displayName ? (
              <span className="text-xs text-[var(--red)]">
                {state.errors.displayName[0]}
              </span>
            ) : null}
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            公开宣言
            <textarea
              className="focus-ring min-h-24 resize-y rounded-md border border-black/15 px-3 py-2 text-base font-normal"
              name="slogan"
              maxLength={80}
              required
            />
            {state.errors?.slogan ? (
              <span className="text-xs text-[var(--red)]">
                {state.errors.slogan[0]}
              </span>
            ) : null}
          </label>
        </>
      ) : null}

      <label className="grid gap-2 text-sm font-semibold">
        密码
        <input
          className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base font-normal"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
        {state.errors?.password ? (
          <span className="text-xs text-[var(--red)]">
            {state.errors.password[0]}
          </span>
        ) : null}
      </label>

      {state.message ? (
        <p className="rounded-md border border-[var(--red)]/30 bg-red-50 px-3 py-2 text-sm font-semibold text-[var(--red)]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--orange)] px-4 py-2 text-sm font-black text-white hover:bg-[#dd6815]"
      >
        {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {pending ? "处理中" : isLogin ? "登录" : "注册并等待审核"}
      </button>

      <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <Lock className="h-4 w-4" />
          密码加密存储
        </span>
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-semibold text-[var(--teal)] hover:underline"
        >
          {isLogin ? "创建账号" : "已有账号"}
        </Link>
      </div>
    </form>
  );
}
