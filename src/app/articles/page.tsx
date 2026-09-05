import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { ArticleCard } from "@/components/article-card";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { Button, ButtonLink, InputField } from "@/components/ui";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { articleCardSelect } from "@/lib/articles-data";
import { publicArticleWhere } from "@/lib/article-service";

export const metadata: Metadata = { title: "社区文章" };
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const where = {
    ...publicArticleWhere,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { excerpt: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const count = isDatabaseConfigured()
    ? await prisma.article.count({ where })
    : 0;
  const pages = Math.max(1, Math.ceil(count / 12));
  const page = Math.min(
    pages,
    Math.max(1, Math.trunc(Number(query.page) || 1)),
  );
  const articles = isDatabaseConfigured()
    ? await prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 12,
        take: 12,
        select: articleCardSelect,
      })
    : [];
  return (
    <main className="page-shell">
      <PageHeading title="文章" />
      <form action="/articles" method="get" className="article-search">
        <InputField
          label="搜索文章"
          name="q"
          defaultValue={q}
          key={q}
          placeholder="标题、摘要…"
          maxLength={100}
        />
        <Button type="submit" variant="secondary" aria-label="搜索文章">
          <Search size={17} />
        </Button>
      </form>
      {articles.length ? (
        <div className="article-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? "没有找到匹配的文章" : "暂无文章"}
          description={q ? "试试其他关键词。" : undefined}
          action={
            q ? (
              <ButtonLink href="/articles" variant="secondary">
                查看全部文章
              </ButtonLink>
            ) : undefined
          }
        />
      )}
      {pages > 1 ? (
        <nav className="article-pagination" aria-label="文章分页">
          {page > 1 ? (
            <Link
              href={`/articles?${new URLSearchParams({ q, page: String(page - 1) })}`}
            >
              上一页
            </Link>
          ) : (
            <span />
          )}
          <span>
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link
              href={`/articles?${new URLSearchParams({ q, page: String(page + 1) })}`}
            >
              下一页
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
