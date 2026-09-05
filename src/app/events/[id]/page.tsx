import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Info,
  Mic,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { cancelRegistrationAction, registerEventAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { SiteCover } from "@/components/site-content";
import {
  ButtonLink,
  Capacity,
  Card,
  CheckField,
  Chip,
  InputField,
  Notice,
  SelectField,
  StatusChip,
  TextAreaField,
} from "@/components/ui";
import { canJoinEvents, getCurrentUser } from "@/lib/auth";
import { getPublicEvent } from "@/lib/data";
import {
  eventStatusLabels,
  eventTypeLabel,
  registrationStatusLabels,
  roleLabels,
} from "@/lib/format";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";
import { formatEventDate, shanghaiDateValue } from "@/lib/event-date";

export const dynamic = "force-dynamic";
export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const [event, user] = await Promise.all([
    getPublicEvent(id),
    getCurrentUser(),
  ]);
  if (!event) notFound();
  const userRegistration =
    user && isDatabaseConfigured()
      ? await prisma.eventRegistration.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: user.id } },
        })
      : null;
  const approvedCount = event.registrations?.length ?? 0;
  const full = approvedCount >= event.maxParticipants;
  const deadlinePassed = isPastDate(event.signupDeadline);
  const joinAllowed = canJoinEvents(user);
  const unavailable =
    !["OPEN", "RUNNING"].includes(event.status) ||
    event.signupClosed ||
    full ||
    deadlinePassed ||
    !joinAllowed;
  const reason =
    !["OPEN", "RUNNING"].includes(event.status) || event.signupClosed
      ? "当前活动未开放报名。"
      : deadlinePassed
        ? "本场活动的报名已截止。"
        : full
          ? "本场活动名额已满。"
          : !joinAllowed
            ? "账号与资料通过审核后，即可报名。"
            : "";
  const errors: Record<string, string> = {
    profile: "账号和资料通过审核后才能报名。",
    full: "活动名额已满。",
    closed: "当前活动未开放报名。",
    deadline: "报名已截止。",
    registered: "你已经报名了这场活动。",
  };
  const error =
    typeof query.error === "string" ? errors[query.error] : undefined;
  return (
    <main className="page-shell">
      <div className="mb-5">
        <ButtonLink href="/events" variant="ghost" size="sm">
          <ArrowLeft size={15} />
          返回活动大厅
        </ButtonLink>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_350px]">
        <div className="grid min-w-0 gap-6">
          <Card className="gap-0 overflow-hidden border border-border p-0 shadow-none">
            <SiteCover />
            <div className="grid gap-7 p-6 sm:p-8">
              <div className="flex flex-wrap gap-2">
                <Chip size="sm" variant="secondary">
                  {eventTypeLabel(event)}
                </Chip>
                <StatusChip
                  status={event.status}
                  label={
                    eventStatusLabels[
                      event.status as keyof typeof eventStatusLabels
                    ] ?? event.status
                  }
                />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {event.title}
              </h1>
              <div className="grid gap-5 rounded-2xl bg-surface-secondary p-5 text-sm sm:grid-cols-2">
                <div className="detail-list">
                  <div>
                    <CalendarClock />
                    <div>
                      <p className="mb-1 text-xs text-muted">
                        活动日期（上海时间）
                      </p>
                      <time dateTime={shanghaiDateValue(event.startTime)}>
                        {formatEventDate(event.startTime)}
                      </time>
                    </div>
                  </div>
                  <div>
                    <Clock />
                    <div>
                      <p className="mb-1 text-xs text-muted">
                        报名截止日期（上海时间）
                      </p>
                      {event.signupDeadline
                        ? formatEventDate(event.signupDeadline) + " 当日截止"
                        : "活动结束前均可报名"}
                    </div>
                  </div>
                </div>
                <div className="detail-list">
                  <div>
                    <Users />
                    <div>
                      <p className="mb-1 text-xs text-muted">活动人数</p>
                      {approvedCount} / {event.maxParticipants} 人已通过
                    </div>
                  </div>
                  <div>
                    <Mic />
                    <div>
                      <p className="mb-1 text-xs text-muted">语音频道</p>
                      <p className="break-words">
                        {event.voiceChannel || "等待组织者安排"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <section>
                <h2 className="mb-3 text-base font-semibold">关于这场活动</h2>
                <p className="whitespace-pre-wrap break-words text-sm leading-8 text-muted">
                  {event.description}
                </p>
              </section>
              {event.requirements ? (
                <section className="border-t border-separator pt-6">
                  <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
                    <Info size={17} className="text-accent" />
                    参与要求
                  </h2>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted">
                    {event.requirements}
                  </p>
                </section>
              ) : null}
            </div>
          </Card>
          <Card className="gap-5 border border-border p-6 shadow-none">
            <div className="flex items-center justify-between">
              <h2 className="section-title">已加入的队友</h2>
              <Chip size="sm" variant="secondary">
                {approvedCount} 人
              </Chip>
            </div>
            {event.registrations?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {event.registrations.map((registration) => {
                  const profile =
                    "user" in registration ? registration.user?.profile : null;
                  const preferredRole =
                    "preferredRole" in registration
                      ? registration.preferredRole
                      : null;
                  const name = profile?.displayName ?? "玩家";
                  return (
                    <div
                      key={registration.id}
                      className="flex items-center gap-3 rounded-xl bg-surface-secondary p-3"
                    >
                      <Avatar src={profile?.avatarUrl} name={name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {preferredRole
                            ? roleLabels[
                                preferredRole as keyof typeof roleLabels
                              ]
                            : "未选择位置"}
                        </p>
                      </div>
                      <CheckCircle2
                        size={16}
                        className="ml-auto shrink-0 text-success"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">
                还没有通过审核的报名，期待你的加入。
              </p>
            )}
          </Card>
        </div>
        <aside className="grid gap-4 lg:sticky lg:top-28">
          <Card className="gap-5 border border-border p-6 shadow-none">
            <div>
              <p className="eyebrow">Join the squad</p>
              <h2 className="text-xl font-semibold">为你留个位置</h2>
            </div>
            <Capacity count={approvedCount} max={event.maxParticipants} />
            {query.registered ? (
              <Notice tone="success">报名已提交，等待管理员审核。</Notice>
            ) : null}
            {query.cancelled ? <Notice>报名已取消。</Notice> : null}
            {error ? <Notice tone="warning">{error}</Notice> : null}
            {!user ? (
              <div className="grid gap-4">
                <p className="text-sm leading-6 text-muted">
                  登录并通过资料审核后，即可提交报名。报名也需要管理员审核。
                </p>
                {event.status !== "OPEN" || deadlinePassed || full ? (
                  <Notice tone="warning">{reason}</Notice>
                ) : null}
                <ButtonLink href="/login" className="w-full">
                  登录后报名
                </ButtonLink>
              </div>
            ) : userRegistration && userRegistration.status !== "CANCELLED" ? (
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted">我的报名</span>
                  <StatusChip
                    status={userRegistration.status}
                    label={registrationStatusLabels[userRegistration.status]}
                  />
                </div>
                <form action={cancelRegistrationAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <ActionButton
                    variant="outline"
                    className="w-full"
                    pendingLabel="取消中…"
                  >
                    取消报名
                  </ActionButton>
                </form>
              </div>
            ) : (
              <form action={registerEventAction} className="grid gap-5">
                <input type="hidden" name="eventId" value={event.id} />
                {reason ? <Notice tone="warning">{reason}</Notice> : null}
                {!joinAllowed ? (
                  <ButtonLink href="/me" variant="secondary" size="sm">
                    查看我的资料
                  </ButtonLink>
                ) : null}
                <SelectField
                  label="想玩的位置"
                  name="preferredRole"
                  options={{ "": "暂不选择", ...roleLabels }}
                  defaultValue=""
                  disabled={unavailable}
                />
                <InputField
                  label="可用英雄"
                  name="heroes"
                  placeholder="安娜，猎空，温斯顿"
                  disabled={unavailable}
                />
                <CheckField name="voiceAvailable" disabled={unavailable}>
                  可以语音交流
                </CheckField>
                <TextAreaField
                  label="报名备注"
                  name="note"
                  placeholder="告诉组织者你的想法，可留空"
                  disabled={unavailable}
                />
                <ActionButton
                  isDisabled={unavailable}
                  pendingLabel="提交中…"
                  className="w-full"
                >
                  {unavailable ? "暂不可报名" : "提交报名"}
                </ActionButton>
                <p className="text-center text-[11px] leading-5 text-muted">
                  提交后请等待管理员审核。
                </p>
              </form>
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}

function isPastDate(date?: Date | null) {
  return Boolean(date && date.getTime() < Date.now());
}
