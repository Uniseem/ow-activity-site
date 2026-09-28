import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { ArticleEditor } from "@/components/article-editor";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "写文章", robots: { index: false } };
export default async function NewArticlePage() {
  const admin = await requirePermission("articles");
  return (
    <main className="page-shell">
      <ArticleEditor
        key={admin.id}
        id={randomUUID()}
        adminId={admin.id}
        initial={{ title: "", excerpt: "", coverUrl: "", content: "" }}
        initialRevision={0}
        initialStatus="DRAFT"
      />
    </main>
  );
}
