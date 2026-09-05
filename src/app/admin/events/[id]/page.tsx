import { Check, Mic, UserRound, X } from "lucide-react";
import { notFound } from "next/navigation";
import { reviewRegistrationAction, updateEventAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { AdminNav } from "@/components/admin-nav";
import { Avatar } from "@/components/avatar";
import { EventForm } from "@/components/event-form";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { ButtonLink, Card, Chip, Notice, StatusChip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  formatDateTime,
  registrationStatusLabels,
  roleLabels,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function AdminEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { createdAt: "asc" },
        include: { user: { include: { profile: true } } },
      },
    },
  });
  if (!event) notFound();
  const approvedCount = event.registrations.filter(
    (registration) => registration.status === "APPROVED",
  ).length;
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Manage event"
        title={event.title}
        description={
          formatDateTime(event.startTime) +
          " · 已通过 " +
          approvedCount +
          " / " +
          event.maxParticipants +
          " 人"
        }
        action={
          <ButtonLink href="/admin/events" variant="secondary">
            返回活动管理
          </ButtonLink>
        }
      />
      <AdminNav />
      <div className="grid gap-6">
        {query.saved ? <Notice tone="success">活动已保存。</Notice> : null}
        {query.error ? (
          <Notice tone="danger">
            {query.error === "full"
              ? "已达到人数上限，不能继续通过报名。"
              : query.error === "date"
                ? "活动时间格式有误，请检查后重新提交。"
                : "活动信息格式有误，请检查必填内容与字数限制。"}
          </Notice>
        ) : null}
        <Card className="gap-6 border border-border p-6 shadow-none sm:p-8">
          <h2 className="section-title">活动设置</h2>
          <EventForm action={updateEventAction} event={event} />
        </Card>
        <section aria-labelledby="registration-review">
          <div className="mb-5 flex items-center gap-3">
            <h2 id="registration-review" className="section-title">
              报名审核
            </h2>
            <Chip variant="secondary" size="sm">
              {event.registrations.length} 条报名
            </Chip>
          </div>
          <div className="grid gap-4">
            {event.registrations.length ? (
              event.registrations.map((registration) => {
                const profile = registration.user.profile;
                const name = profile?.displayName ?? registration.user.username;
                return (
                  <Card
                    key={registration.id}
                    className="grid gap-5 border border-border p-6 shadow-none lg:grid-cols-[1fr_210px]"
                  >
                    <div className="flex min-w-0 gap-4">
                      <Avatar src={profile?.avatarUrl} name={name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">{name}</h3>
                          <StatusChip
                            status={registration.status}
                            label={
                              registrationStatusLabels[registration.status]
                            }
                          />
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted">
                          <div className="flex flex-wrap gap-4">
                            <span className="flex items-center gap-1.5">
                              <UserRound size={15} />
                              {registration.preferredRole
                                ? roleLabels[registration.preferredRole]
                                : "未选择位置"}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Mic size={15} />
                              {registration.voiceAvailable
                                ? "可以语音"
                                : "不能语音"}
                            </span>
                          </div>
                          <p className="break-words">
                            可用英雄：
                            {registration.heroes.join("，") || "未填写"}
                          </p>
                          {registration.note ? (
                            <p className="whitespace-pre-wrap break-words">
                              备注：{registration.note}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <form
                      action={reviewRegistrationAction}
                      className="grid content-start gap-2"
                    >
                      <input
                        type="hidden"
                        name="registrationId"
                        value={registration.id}
                      />
                      <input type="hidden" name="eventId" value={event.id} />
                      <ActionButton
                        name="decision"
                        value="APPROVED"
                        pendingLabel="处理中…"
                      >
                        <Check size={16} />
                        通过报名
                      </ActionButton>
                      <ActionButton
                        name="decision"
                        value="REJECTED"
                        variant="danger-soft"
                        pendingLabel="处理中…"
                      >
                        <X size={16} />
                        拒绝报名
                      </ActionButton>
                    </form>
                  </Card>
                );
              })
            ) : (
              <EmptyState
                title="等待队友报名"
                description="玩家提交报名后，你可以在这里查看并审核。"
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
