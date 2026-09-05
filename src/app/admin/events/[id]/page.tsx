import { Check, Mic, UserRound, X } from "lucide-react";
import { notFound } from "next/navigation";
import { reviewRegistrationAction, updateEventAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { EventForm } from "@/components/event-form";
import { RegistrationReviewTabs } from "@/components/registration-review-tabs";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { ButtonLink, Card, Chip, Notice, StatusChip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import {
  reviewLabels,
  eventStatusLabels,
  registrationStatusLabels,
  roleLabels,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatEventDate } from "@/lib/event-date";
import { syncEventStatuses } from "@/lib/event-schedule";

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
  await syncEventStatuses();
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
  const reviewStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
  const reviewGroups = reviewStatuses.map((status) => ({
    status,
    registrations: event.registrations.filter(
      (registration) => registration.status === status,
    ),
  }));
  const selectedReview =
    typeof query.review === "string" &&
    reviewStatuses.some((status) => status === query.review)
      ? query.review
      : "PENDING";
  const settingsOpen =
    query.view === "settings" ||
    query.error === "date" ||
    query.error === "invalid";
  return (
    <main className="page-shell">
      <PageHeading
        title={event.title}
        description={
          formatEventDate(event.startTime) +
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
      <nav className="mb-5 flex gap-2" aria-label="活动管理栏目">
        <ButtonLink
          href={`/admin/events/${event.id}`}
          variant={settingsOpen ? "ghost" : "primary"}
          size="sm"
        >
          报名审核
        </ButtonLink>
        <ButtonLink
          href={`/admin/events/${event.id}?view=settings`}
          variant={settingsOpen ? "primary" : "ghost"}
          size="sm"
        >
          活动设置
        </ButtonLink>
        {event.status !== "DRAFT" ? (
          <ButtonLink href={`/events/${event.id}`} variant="ghost" size="sm">
            查看前台
          </ButtonLink>
        ) : null}
      </nav>
      <div className="grid gap-6">
        {query.created ? (
          <Notice tone="success">
            {event.status === "DRAFT"
              ? "活动草稿已创建。可在活动设置中开放报名。"
              : "活动已创建并发布，玩家现在可以在前台查看。"}
          </Notice>
        ) : null}
        {query.error && !settingsOpen ? (
          <Notice tone="danger">
            {query.error === "full"
              ? "已达到人数上限，不能继续通过报名。"
              : query.error === "registration"
                ? "这条报名已取消或不存在，请刷新后重试。"
                : query.error === "date"
                  ? "请填写有效日期，报名截止日期不得晚于活动日期。"
                  : "活动信息格式有误，请检查必填内容与字数限制。"}
          </Notice>
        ) : null}
        {settingsOpen ? (
          <Card className="gap-6 border border-border p-6 shadow-none sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">活动设置</h2>
              <StatusChip
                status={event.status}
                label={eventStatusLabels[event.status]}
              />
            </div>
            <EventForm
              action={updateEventAction}
              event={event}
              feedback={
                query.error ? (
                  <Notice tone="danger">
                    {query.error === "date"
                      ? "请填写有效日期，报名截止日期不得晚于活动日期。"
                      : "活动信息格式有误，请检查必填内容与字数限制。"}
                  </Notice>
                ) : query.saved ? (
                  <Notice tone="success">
                    活动已保存 · {eventStatusLabels[event.status]}
                    {event.status === "DRAFT"
                      ? "，仅管理员可见。"
                      : "，前台已同步更新。"}
                  </Notice>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <section aria-labelledby="registration-review">
            <div className="mb-5 flex items-center gap-3">
              <h2 id="registration-review" className="section-title">
                报名审核
              </h2>
              <Chip variant="secondary" size="sm">
                {reviewGroups.reduce(
                  (count, group) => count + group.registrations.length,
                  0,
                )}{" "}
                条报名
              </Chip>
            </div>
            {query.reviewed === "APPROVED" || query.reviewed === "REJECTED" ? (
              <div className="mb-4">
                <Notice tone="success">
                  {query.reviewed === "APPROVED"
                    ? "报名已通过，已移入“已通过”栏目。"
                    : "报名已拒绝，已移入“已拒绝”栏目。"}
                </Notice>
              </div>
            ) : null}
            <RegistrationReviewTabs
              selected={selectedReview}
              sections={reviewGroups.map(({ status, registrations }) => ({
                id: status,
                label: reviewLabels[status],
                count: registrations.length,
                content: (
                  <div className="grid gap-4">
                    {registrations.length ? (
                      registrations.map((registration) => {
                        const profile = registration.user.profile;
                        const name =
                          profile?.displayName ?? registration.user.username;
                        return (
                          <Card
                            key={registration.id}
                            className="grid gap-5 border border-border p-6 shadow-none lg:grid-cols-[1fr_210px]"
                          >
                            <div className="flex min-w-0 gap-4">
                              <Avatar src={profile?.avatarUrl} name={name} />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-lg font-semibold">
                                    {name}
                                  </h3>
                                  <StatusChip
                                    status={registration.status}
                                    label={
                                      registrationStatusLabels[
                                        registration.status
                                      ]
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
                              <input
                                type="hidden"
                                name="eventId"
                                value={event.id}
                              />
                              <input
                                type="hidden"
                                name="reviewTab"
                                value={status}
                              />
                              {registration.status !== "APPROVED" ? (
                                <ActionButton
                                  name="decision"
                                  value="APPROVED"
                                  pendingLabel="处理中…"
                                >
                                  <Check size={16} />
                                  通过报名
                                </ActionButton>
                              ) : null}
                              {registration.status !== "REJECTED" ? (
                                <ActionButton
                                  name="decision"
                                  value="REJECTED"
                                  variant="danger-soft"
                                  pendingLabel="处理中…"
                                >
                                  <X size={16} />
                                  拒绝报名
                                </ActionButton>
                              ) : null}
                            </form>
                          </Card>
                        );
                      })
                    ) : (
                      <EmptyState
                        title={"暂无" + reviewLabels[status] + "的报名"}
                        description={
                          status === "PENDING"
                            ? "新的报名会出现在这里，审核后将移入对应栏目。"
                            : "审核结果会显示在对应栏目中。"
                        }
                      />
                    )}
                  </div>
                ),
              }))}
            />
          </section>
        )}
      </div>
    </main>
  );
}
