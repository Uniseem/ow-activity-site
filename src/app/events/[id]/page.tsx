import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { cancelRegistrationAction, registerEventAction } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { SiteCover } from "@/components/site-content";
import {
  ButtonLink,
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
      <div className="mb-5 flex items-center justify-between gap-3">
        <ButtonLink href="/events" variant="ghost" size="sm">
          <ArrowLeft size={15} />
          全部活动
        </ButtonLink>
        <ButtonLink href="#registration" variant="secondary" size="sm">
          {userRegistration ? "查看我的报名" : "前往报名"}
        </ButtonLink>
      </div>
      <div className="detail-layout">
        <div className="grid min-w-0 gap-6">
          <Card className="gap-0 overflow-hidden p-0">
            <SiteCover src={event.coverUrl} />
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
              <dl className="grid gap-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="mb-1 text-muted">活动日期（上海时间）</dt>
                  <dd>
                    <time dateTime={shanghaiDateValue(event.startTime)}>
                      {formatEventDate(event.startTime)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-muted">报名截止</dt>
                  <dd>
                    {event.signupDeadline
                      ? formatEventDate(event.signupDeadline) + " 当日截止"
                      : "活动结束前"}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-muted">已通过报名</dt>
                  <dd>
                    {approvedCount} / {event.maxParticipants} 人
                  </dd>
                </div>
                {event.voiceChannel ? (
                  <div>
                    <dt className="mb-1 text-muted">语音频道</dt>
                    <dd className="break-words">{event.voiceChannel}</dd>
                  </div>
                ) : null}
              </dl>
              <section>
                <h2 className="mb-3 text-base font-semibold">活动介绍</h2>
                <p className="whitespace-pre-wrap break-words text-sm leading-8 text-muted">
                  {event.description}
                </p>
              </section>
              {event.requirements ? (
                <section className="border-t border-separator pt-6">
                  <h2 className="mb-3 text-base font-semibold">参与要求</h2>
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-muted">
                    {event.requirements}
                  </p>
                </section>
              ) : null}
            </div>
          </Card>
          <Card className="gap-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">参与玩家</h2>
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
                      className="flex items-center gap-3 py-2"
                    >
                      <Avatar src={profile?.avatarUrl} name={name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{name}</p>
                        {preferredRole ? (
                          <p className="mt-1 text-sm text-muted">
                            {
                              roleLabels[
                                preferredRole as keyof typeof roleLabels
                              ]
                            }
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted">
                暂无通过审核的报名。
              </p>
            )}
          </Card>
        </div>
        <aside className="registration-panel" id="registration">
          <Card className="gap-5 p-6">
            <h2 className="text-xl font-semibold">活动报名</h2>
            {query.registered ? (
              <Notice tone="success">报名已提交，等待管理员审核。</Notice>
            ) : null}
            {query.cancelled ? <Notice>报名已取消。</Notice> : null}
            {error ? <Notice tone="warning">{error}</Notice> : null}
            {!user ? (
              <div className="grid gap-4">
                <p className="text-sm leading-6 text-muted">
                  账号、资料和活动报名均需管理员审核。
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
                <p className="text-center text-sm leading-5 text-muted">
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
