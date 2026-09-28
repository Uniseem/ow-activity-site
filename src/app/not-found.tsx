import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/page-heading";
import { ButtonLink } from "@/components/ui";
export default function NotFound() {
  return (
    <main className="page-shell py-20">
      <EmptyState
        title="这个位置暂时没有队友"
        description="页面可能不存在，或活动尚未公开。回到活动大厅看看吧。"
        action={
          <ButtonLink href="/events">
            <ArrowLeft size={16} />
            返回活动大厅
          </ButtonLink>
        }
      />
    </main>
  );
}
