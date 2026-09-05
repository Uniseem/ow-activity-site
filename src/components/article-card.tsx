import Link from "next/link";
import { Card } from "@/components/ui";
import { CoverImage } from "@/components/cover-image";
import { articleDate, safeArticleUrl } from "@/lib/article-input";

export function ArticleCard({
  article,
  variant = "default",
}: {
  article: {
    id: string;
    title: string;
    excerpt: string;
    coverUrl: string;
    publishedAt: Date | null;
    author: { profile: { displayName: string } | null };
  };
  variant?: "default" | "featured" | "compact";
}) {
  const cover = safeArticleUrl(article.coverUrl, true);
  return (
    <article className={`article-card article-card--${variant}`}>
      <Card className="cover-glass-card h-full gap-0 overflow-hidden">
        {cover ? (
          <Link
            href={`/articles/${article.id}`}
            className="article-card-cover cover-glass-image"
            tabIndex={-1}
            aria-hidden="true"
          >
            <CoverImage src={cover} alt="" />
          </Link>
        ) : null}
        <div className="article-card-copy cover-glass-panel">
          <h2>
            <Link href={`/articles/${article.id}`}>{article.title}</Link>
          </h2>
          {article.excerpt ? (
            <p className="article-card-excerpt">{article.excerpt}</p>
          ) : null}
          <p className="article-meta">
            <time dateTime={article.publishedAt?.toISOString()}>
              {articleDate(article.publishedAt)}
            </time>
            <span>·</span>
            {article.author.profile?.displayName || "社区编辑"}
          </p>
        </div>
      </Card>
    </article>
  );
}
