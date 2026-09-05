/* eslint-disable @next/next/no-img-element -- 配图地址来自管理员上传或填写 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui";
import { articleDate, safeArticleUrl } from "@/lib/article-input";

export function ArticleCard({
  article,
}: {
  article: {
    id: string;
    title: string;
    excerpt: string;
    coverUrl: string;
    publishedAt: Date | null;
    author: { profile: { displayName: string } | null };
  };
}) {
  const cover = safeArticleUrl(article.coverUrl, true);
  return (
    <article className="article-card">
      <Card className="h-full gap-0 overflow-hidden p-0">
        {cover ? (
          <Link
            href={`/articles/${article.id}`}
            className="article-card-cover"
            tabIndex={-1}
            aria-hidden="true"
          >
            <img
              src={cover}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </Link>
        ) : null}
        <div className="article-card-copy">
          <p className="article-meta">
            {articleDate(article.publishedAt)}
            <span>·</span>
            {article.author.profile?.displayName || "社区编辑"}
          </p>
          <h2>
            <Link href={`/articles/${article.id}`}>{article.title}</Link>
          </h2>
          {article.excerpt ? (
            <p className="article-card-excerpt">{article.excerpt}</p>
          ) : null}
          <Link href={`/articles/${article.id}`} className="text-action">
            阅读文章
            <ArrowRight size={15} />
          </Link>
        </div>
      </Card>
    </article>
  );
}
