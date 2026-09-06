"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminUserFormResult } from "@/app/actions";
import { Notice } from "@/components/ui";

export function AdminUserForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<AdminUserFormResult>;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [result, submit, pending] = useActionState(
    async (
      _previous: AdminUserFormResult,
      formData: FormData,
    ): Promise<AdminUserFormResult> => {
      try {
        const saved = await action(formData);
        if (saved.ok) {
          if (saved.redirectTo) router.push(saved.redirectTo);
          else router.refresh();
        }
        return saved;
      } catch {
        return { ok: false, message: "操作失败，填写内容已保留，请重试。" };
      }
    },
    { ok: false, message: "" },
  );
  return (
    <form
      action={submit}
      className={className}
      onResetCapture={(event) => event.preventDefault()}
    >
      <fieldset disabled={pending} className="grid min-w-0 gap-4">
        {children}
      </fieldset>
      {result.message ? (
        <Notice tone={result.ok ? "success" : "danger"}>
          {result.message}
          {result.authRequired ? (
            <Link
              href="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block underline"
            >
              在新标签页重新登录
            </Link>
          ) : null}
        </Notice>
      ) : null}
    </form>
  );
}
