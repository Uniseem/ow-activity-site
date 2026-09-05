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
          <p className="campus-eyebrow">SJTU / 社区文章</p>
          <h1>{article.title}</h1>
          <p className="article-meta">
            <span>{article.author.profile?.displayName || "社区编辑"}</span>
            <span>·</span>
            <time dateTime={article.publishedAt?.toISOString()}>
              {articleDate(article.publishedAt)}
            </time>
          </p>
          {article.excerpt ? (
            <p className="article-deck">{article.excerpt}</p>
          ) : null}
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
      <div className="article-reading-end">
        <span>读完了，去看看下一场活动。</span>
        <Link href="/events" className="text-action">
          社区活动 →
        </Link>
      </div>
    </main>
  );
}
