/* eslint-disable @next/next/no-img-element -- 文章封面可由管理员填写外部地址 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ArticleContent } from "@/components/article-content";
import { getPublishedArticle } from "@/lib/articles-data";
import { articleDate, safeArticleUrl } from "@/lib/article-input";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const article = await getPublishedArticle((await params).id);
  if (!article)
    return { title: "文章不存在", robots: { index: false, follow: false } };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt?.toISOString(),
    },
  };
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const article = await getPublishedArticle((await params).id);
  if (!article) notFound();
  const cover = safeArticleUrl(article.coverUrl, true);
  return (
    <main className="page-shell article-reading">
      <Link href="/articles" className="text-action">
        <ArrowLeft size={16} />
        全部文章
      </Link>
      <article>
        <header className="article-reading-header">
          <h1>{article.title}</h1>
          <p className="article-meta">
            <span>{article.author.profile?.displayName || "社区编辑"}</span>
            <span>·</span>
            <time dateTime={article.publishedAt?.toISOString()}>
              {articleDate(article.publishedAt)}
            </time>
          </p>
        </header>
        {cover ? (
          <img
            className="article-reading-cover"
            src={cover}
            alt={article.title + "的封面"}
            referrerPolicy="no-referrer"
          />
        ) : null}
        <ArticleContent content={article.content} />
      </article>
    </main>
  );
}
