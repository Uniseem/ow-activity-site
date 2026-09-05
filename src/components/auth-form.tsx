"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Spinner } from "@heroui/react";
import { loginAction, registerAction, type FormState } from "@/app/actions";
import { Button, InputField, Notice, TextAreaField } from "@/components/ui";

const initialState: FormState = { message: "" };

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState(
    isLogin ? loginAction : registerAction,
    initialState,
  );
  return (
    <form action={formAction} className="grid gap-5">
      <InputField
        label="用户名"
        name="username"
        autoComplete="username"
        placeholder="你的登录用户名"
        minLength={isLogin ? undefined : 3}
        maxLength={isLogin ? undefined : 24}
        pattern={isLogin ? undefined : "[A-Za-z0-9_]{3,24}"}
        required
        description={isLogin ? undefined : "3–24 位英文、数字或下划线"}
        error={state.errors?.username?.[0]}
      />
      {!isLogin ? (
        <>
          <InputField
            label="公开昵称"
            name="displayName"
            autoComplete="nickname"
            placeholder="队友该怎么称呼你？"
            minLength={2}
            maxLength={20}
            required
            error={state.errors?.displayName?.[0]}
          />
          <TextAreaField
            label="公开宣言"
            name="slogan"
            placeholder="介绍一下自己，或写下你的开黑宣言"
            maxLength={80}
            required
            description="最多 80 字，将展示在你的玩家卡片上。"
            error={state.errors?.slogan?.[0]}
          />
        </>
      ) : null}
      <InputField
        label="密码"
        name="password"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        placeholder={isLogin ? "输入你的密码" : "设置至少 8 位密码"}
        minLength={isLogin ? undefined : 8}
        maxLength={isLogin ? undefined : 72}
        required
        error={state.errors?.password?.[0]}
      />
      {state.message ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button
        type="submit"
        isDisabled={pending}
        isPending={pending}
        size="lg"
        className="mt-1 w-full"
      >
        {pending ? <Spinner size="sm" color="current" /> : null}
        {pending ? "处理中…" : isLogin ? "登录" : "注册并等待审核"}
        {!pending ? <ArrowRight size={17} /> : null}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <LockKeyhole size={13} />
          密码加密存储
        </span>
        <Link
          href={isLogin ? "/register" : "/login"}
          className="font-medium text-accent hover:underline"
        >
          {isLogin ? "还没有账号？去注册" : "已有账号？去登录"}
        </Link>
      </div>
    </form>
  );
}
