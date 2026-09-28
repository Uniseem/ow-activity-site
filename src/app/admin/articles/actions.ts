"use server";
import { revalidateArticles, revalidateHome } from "@/lib/revalidate-site";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/admin-permissions";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  articleIdentitySchema,
  articleInputSchema,
  type ArticleResult,
} from "@/lib/article-input";
import {
  ArticleConflictError,
  deleteArticle,
  saveArticle,
} from "@/lib/article-service";

async function articleActionAdmin(formData: FormData) {
  const admin = await getCurrentUser();
  if (!admin || admin.id !== formData.get("editorUserId"))
    return {
      error: {
        ok: false,
        authRequired: true,
        message:
          "登录已过期或账号已切换。请在新标签页重新登录原管理员账号，再回来重试；当前内容仍保留。",
      },
    };
  if (!hasPermission(admin, "articles"))
    return {
      error: {
        ok: false,
        message: "当前账号已无文章管理权限。内容仍保留，可通过“更多”导出备份。",
      },
    };
  return { admin };
}

export async function inspectArticleRecoveryAction(
  formData: FormData,
): Promise<ArticleResult & { exists: boolean }> {
  const access = await articleActionAdmin(formData);
  if (access.error) return { ...access.error, exists: false };
  const parsed = articleIdentitySchema.safeParse({
    id: formData.get("id"),
    revision: 0,
  });
  if (!parsed.success)
    return { ok: false, exists: false, message: "备份文章标识无效。" };
  const article = await prisma.article.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  });
  return { ok: true, exists: !!article, message: "" };
}

function refreshArticles(id: string) {
  revalidateArticles(id);
  revalidateHome();
}
export async function saveArticleAction(
  formData: FormData,
): Promise<ArticleResult> {
  const access = await articleActionAdmin(formData);
  if (access.error) return access.error;
  const admin = access.admin!;
  const parsed = articleInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message || "文章内容无效。",
    };
  try {
    const saved = await saveArticle(prisma, admin, parsed.data);
    refreshArticles(parsed.data.id);
    return {
      ok: true,
      ...saved,
      message: {
        published: "发布成功，文章现已在前台公开。",
        updated: "更新成功，前台已显示最新内容。",
        withdrawn: "已撤回为草稿，文章已从前台下架。",
        "draft-saved": "草稿保存成功，仅管理员可见。",
      }[saved.operation],
    };
  } catch (error) {
    if (error instanceof ArticleConflictError)
      return { ok: false, message: error.message };
    console.error(
      "保存文章失败",
      error instanceof Error ? error.name : "unknown",
    );
    return {
      ok: false,
      message: "保存失败，请稍后重试。当前内容仍保留在编辑器中。",
    };
  }
}
export async function deleteArticleAction(
  formData: FormData,
): Promise<ArticleResult> {
  const access = await articleActionAdmin(formData);
  if (access.error) return access.error;
  const admin = access.admin!;
  const parsed = articleIdentitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.revision === 0)
    return { ok: false, message: "文章标识无效。" };
  try {
    await deleteArticle(prisma, admin, parsed.data.id, parsed.data.revision);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ArticleConflictError
          ? error.message
          : "删除失败，请稍后重试。",
    };
  }
  refreshArticles(parsed.data.id);
  redirect("/admin/articles?deleted=1");
}
