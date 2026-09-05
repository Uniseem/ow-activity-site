"use client";
import { RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/ui";
export default function ErrorPage({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  return (
    <main className="page-shell py-20">
      <Card className="mx-auto max-w-lg items-center gap-5 border border-border p-10 text-center shadow-none">
        <span className="icon-tile">
          <RefreshCw size={23} />
        </span>
        <h1 className="text-2xl font-semibold">加载遇到了一点问题</h1>
        <p className="text-sm leading-7 text-muted">
          页面暂时无法加载，请稍后重试。
        </p>
        <Button onPress={unstable_retry}>重新加载</Button>
      </Card>
    </main>
  );
}
