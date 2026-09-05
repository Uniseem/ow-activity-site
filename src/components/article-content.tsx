/* eslint-disable @next/next/no-img-element -- 管理员可使用本站上传或外部图片，直接由浏览器加载 */
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeArticleUrl } from "@/lib/article-input";

export function ArticleContent({ content }: { content: string }) {
  return (
    <div className="article-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url, key) => safeArticleUrl(url, key === "src")}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ src, alt, title }) =>
            typeof src === "string" && src ? (
              <img
                src={src}
                alt={alt || "文章配图"}
                title={title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            ) : null,
          table: ({ children }) => (
            <div className="article-table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
