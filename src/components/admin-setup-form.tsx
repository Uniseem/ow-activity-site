"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setUpAdminAction } from "@/app/admin/setup/actions";
import { Button, InputField, Notice } from "@/components/ui";

export function AdminSetupForm() {
  const [state, formAction, pending] = useActionState(setUpAdminAction, {
    message: "",
  });
  return (
    <form action={formAction} className="grid gap-5">
      <InputField
        label="管理员用户名"
        name="username"
        autoComplete="username"
        placeholder="设置登录用户名"
        minLength={3}
        maxLength={24}
        pattern="[A-Za-z0-9_]{3,24}"
        required
        description="3–24 位英文、数字或下划线"
        error={state.errors?.username?.[0]}
      />
      <InputField
        label="公开昵称"
        name="displayName"
        autoComplete="nickname"
        placeholder="大家怎么称呼你？"
        minLength={2}
        maxLength={20}
        required
        error={state.errors?.displayName?.[0]}
      />
      <InputField
        label="密码"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="至少 8 位密码"
        minLength={8}
        maxLength={72}
        required
        error={state.errors?.password?.[0]}
      />
      <InputField
        label="确认密码"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="再次输入密码"
        minLength={8}
        maxLength={72}
        required
        error={state.errors?.confirmPassword?.[0]}
      />
      {state.message ? <Notice tone="danger">{state.message}</Notice> : null}
      <Button
        type="submit"
        size="lg"
        isDisabled={pending}
        isPending={pending}
        className="w-full"
      >
        {pending ? "正在创建…" : "注册为管理员并进入后台"}
      </Button>
      <Link
        href="/login"
        className="text-center text-sm text-accent hover:underline"
      >
        已有账号？去登录
      </Link>
    </form>
  );
}
