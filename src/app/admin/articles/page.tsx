import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { Button, ButtonLink, Chip, InputField, Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { articleTime, articleStatusLabels } from "@/lib/article-input";

export const metadata: Metadata = {
  title: "文章管理",
  robots: { index: false },
};
const filters = [
  { id: "all", label: "全部文章" },
  { id: "DRAFT", label: "草稿" },
  { id: "PUBLISHED", label: "已发布" },
];
export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    deleted?: string;
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const status: "all" | "DRAFT" | "PUBLISHED" =
    query.status === "DRAFT" || query.status === "PUBLISHED"
      ? query.status
      : "all";
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [count, statuses] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const statusCount = (filter: string) =>
    statuses.reduce(
      (total, row) =>
        total +
        (filter === "all" || row.status === filter ? row._count._all : 0),
      0,
    );
  const pages = Math.max(1, Math.ceil(count / 20));
  const page = Math.min(
    pages,
    Math.max(1, Math.trunc(Number(query.page) || 1)),
  );
  const articles = await prisma.article.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 20,
    skip: (page - 1) * 20,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      publishedAt: true,
    },
  });
  return (
    <main className="page-shell">
      <PageHeading
        title="文章管理"
        description="草稿仅后台可见，已发布的文章会展示在前台。"
        action={
          <ButtonLink href="/admin/articles/new">
            <Plus size={17} />
            写文章
          </ButtonLink>
        }
      />
      {query.deleted === "1" ? (
        <div className="mb-5">
          <Notice tone="success">文章已删除，前台和后台列表均已移除。</Notice>
        </div>
      ) : null}
      <div className="directory-toolbar">
        <nav className="directory-filters" aria-label="文章状态筛选">
          {filters.map((filter) => (
            <Link
              key={filter.id}
              href={`/admin/articles?${new URLSearchParams({ status: filter.id, q })}`}
              className={`filter-link ${status === filter.id ? "active" : ""}`}
              aria-current={status === filter.id ? "page" : undefined}
            >
              {filter.label} <span>{statusCount(filter.id)}</span>
            </Link>
          ))}
        </nav>
        <form
          action="/admin/articles"
          method="get"
          className="directory-search"
        >
          <input type="hidden" name="status" value={status} />
          <InputField
            label="搜索文章标题"
            name="q"
            defaultValue={q}
            key={q}
            maxLength={100}
          />
          <Button type="submit" variant="secondary" aria-label="搜索文章">
            <Search size={17} />
          </Button>
        </form>
      </div>
      <p className="directory-count">共 {count} 篇文章</p>
      {articles.length ? (
        <div className="admin-article-list">
          {articles.map((article) => (
            <article key={article.id}>
              <div className="admin-article-summary">
                <h2>
                  <Link href={`/admin/articles/${article.id}`}>
                    {article.title}
                  </Link>
                </h2>
                <p>
                  保存于 {articleTime(article.updatedAt)}
                  {article.status === "PUBLISHED"
                    ? ` · 发布于 ${articleTime(article.publishedAt)}`
                    : ""}
                </p>
              </div>
              <Chip
                size="sm"
                color={article.status === "PUBLISHED" ? "success" : "default"}
              >
                {articleStatusLabels[article.status]}
              </Chip>
              {article.status === "PUBLISHED" ? (
                <Link
                  href={`/articles/${article.id}`}
                  target="_blank"
                  className="text-action admin-article-view"
                >
                  <Eye size={15} />
                  查看
                </Link>
              ) : null}
              <ButtonLink
                href={`/admin/articles/${article.id}`}
                variant="secondary"
                size="sm"
              >
                编辑
              </ButtonLink>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? "没有匹配的文章" : "这里还没有文章"}
          description={
            q ? "换个标题关键词试试。" : "从一篇社区介绍、公告或活动回顾开始。"
          }
          action={
            <ButtonLink href="/admin/articles/new">写第一篇文章</ButtonLink>
          }
        />
      )}
      {pages > 1 ? (
        <nav className="article-pagination" aria-label="管理文章分页">
          {page > 1 ? (
            <Link
              href={`/admin/articles?${new URLSearchParams({ status, q, page: String(page - 1) })}`}
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
              href={`/admin/articles?${new URLSearchParams({ status, q, page: String(page + 1) })}`}
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
