"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions";
import { AdminSetupClosedError, registerInitialAdmin } from "@/lib/admin-setup";
import { initialAdminSchema } from "@/lib/admin-setup-input";
import { createSession } from "@/lib/auth";
import { assertDatabaseConfigured, prisma } from "@/lib/prisma";

export async function setUpAdminAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = initialAdminSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      message: "请检查管理员信息。",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let userId: string;
  try {
    assertDatabaseConfigured();
    const user = await registerInitialAdmin(prisma, parsed.data);
    userId = user.id;
  } catch (error) {
    if (error instanceof AdminSetupClosedError)
      return { message: error.message };
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { message: "这个用户名已被注册，请使用其他用户名。" };
    }
    return { message: "创建失败，请稍后重试。" };
  }

  revalidatePath("/", "layout");
  try {
    await createSession(userId);
  } catch {
    return {
      message: "管理员已创建，请前往登录页使用刚设置的用户名和密码登录。",
    };
  }
  redirect("/admin");
}
