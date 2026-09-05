import type { PrismaClient } from "@/generated/prisma/client";
import { usesD1 } from "@/lib/database-provider";
import {
  articleExcerpt,
  articleInputSchema,
  type ArticleInput,
} from "@/lib/article-input";

type Actor = { id: string; role: string; status: string } | null;
export class ArticleConflictError extends Error {
  constructor() {
    super(
      "文章已被其他页面或管理员修改。请先复制当前正文备份，再刷新页面。原文未被覆盖。",
    );
  }
}
export function assertArticleAdmin(
  actor: Actor,
): asserts actor is NonNullable<Actor> {
  if (!actor || actor.role !== "ADMIN" || actor.status !== "APPROVED")
    throw new Error("无权管理文章。");
}
export async function saveArticle(
  db: PrismaClient,
  actor: Actor,
  raw: ArticleInput,
) {
  assertArticleAdmin(actor);
  const input = articleInputSchema.parse(raw);
  const { id, revision, ...data } = input;
  data.excerpt = articleExcerpt(data);
  const now = new Date();
  const article = {
    title: data.title,
    excerpt: data.excerpt,
    coverUrl: data.coverUrl,
    content: data.content,
  };
  if (revision === 0) {
    const result = await db.article
      .createMany({
        data: [
          {
            id,
            ...data,
            authorId: actor.id,
            updatedAt: now,
            publishedAt: data.status === "PUBLISHED" ? now : null,
          },
        ],
        ...(usesD1(db) ? {} : { skipDuplicates: true }),
      })
      .catch((error: unknown) => {
        if (
          usesD1(db) &&
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        )
          return { count: 0 };
        throw error;
      });
    if (!result.count) throw new ArticleConflictError();
    return {
      revision: 1,
      status: data.status,
      article,
      updatedAt: now.toISOString(),
      publishedAt: data.status === "PUBLISHED" ? now.toISOString() : null,
      operation:
        data.status === "PUBLISHED"
          ? ("published" as const)
          : ("draft-saved" as const),
    };
  }
  const current = await db.article.findUnique({
    where: { id },
    select: { publishedAt: true, status: true },
  });
  if (!current) throw new ArticleConflictError();
  const result = await db.article.updateMany({
    where: { id, revision },
    data: {
      ...data,
      publishedAt:
        current.publishedAt ?? (data.status === "PUBLISHED" ? now : null),
      revision: { increment: 1 },
      updatedAt: now,
    },
  });
  if (!result.count) throw new ArticleConflictError();
  return {
    revision: revision + 1,
    status: data.status,
    article,
    updatedAt: now.toISOString(),
    publishedAt:
      (
        current.publishedAt ?? (data.status === "PUBLISHED" ? now : null)
      )?.toISOString() ?? null,
    operation:
      data.status === "PUBLISHED"
        ? current.status === "PUBLISHED"
          ? ("updated" as const)
          : ("published" as const)
        : current.status === "PUBLISHED"
          ? ("withdrawn" as const)
          : ("draft-saved" as const),
  };
}
export async function deleteArticle(
  db: PrismaClient,
  actor: Actor,
  id: string,
  revision: number,
) {
  assertArticleAdmin(actor);
  const result = await db.article.deleteMany({ where: { id, revision } });
  if (!result.count) throw new ArticleConflictError();
}
export const publicArticleWhere = {
  status: "PUBLISHED" as const,
  publishedAt: { not: null },
};
