import { createEventAction } from "@/app/actions";
import { AdminNav } from "@/components/admin-nav";
import { EventForm } from "@/components/event-form";
import { PageHeading } from "@/components/page-heading";
import { ButtonLink, Card, Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function NewEventPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const query = searchParams ? await searchParams : {};
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Create an event"
        title="创建活动"
        description="写下这场活动的安排，准备召集你的队友。"
        action={
          <ButtonLink href="/admin/events" variant="secondary">
            返回活动管理
          </ButtonLink>
        }
      />
      <AdminNav />
      <div className="mx-auto grid max-w-4xl gap-5">
        {query.error ? (
          <Notice tone="danger">
            {query.error === "date"
              ? "请填写有效日期，报名截止日期不得晚于活动日期。"
              : "活动信息格式有误，请检查必填内容与字数限制。"}
          </Notice>
        ) : null}
        <Card className="gap-6 border border-border p-6 shadow-none sm:p-8">
          <div>
            <h2 className="section-title">活动安排</h2>
            <p className="mt-2 text-xs leading-6 text-muted">
              草稿仅管理员可见，设为「开放报名」后玩家即可申请参加。
            </p>
          </div>
          <EventForm action={createEventAction} />
        </Card>
      </div>
    </main>
  );
}
