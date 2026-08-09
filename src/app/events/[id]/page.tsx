import {
  CalendarClock,
  CheckCircle2,
  Info,
  Mic,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  cancelRegistrationAction,
  registerEventAction,
} from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { getCurrentUser, canJoinEvents } from "@/lib/auth";
import { getPublicEvent } from "@/lib/data";
import {
  eventStatusLabels,
  eventTypeLabels,
  formatDateTime,
  registrationStatusLabels,
  roleLabels,
} from "@/lib/format";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EventDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EventDetailPage({
  params,
  searchParams,
}: EventDetailPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const [event, user] = await Promise.all([getPublicEvent(id), getCurrentUser()]);

  if (!event) {
    notFound();
  }

  const userRegistration =
    user && isDatabaseConfigured()
      ? await prisma.eventRegistration.findUnique({
          where: { eventId_userId: { eventId: event.id, userId: user.id } },
        })
      : null;

  const approvedCount = event.registrations?.length ?? 0;
  const full = approvedCount >= event.maxParticipants;
  const open = event.status === "OPEN" && !full;
  const deadlinePassed = isPastDate(event.signupDeadline);
  const joinAllowed = canJoinEvents(user);

  return (
    <main className="page-shell grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-sm">
        <div className="h-52 bg-[url('/arena-cover.png')] bg-cover bg-center" />
        <div className="grid gap-6 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[var(--orange)] px-3 py-1 text-sm font-black text-white">
              {eventTypeLabels[event.type as keyof typeof eventTypeLabels] ??
                event.type}
            </span>
            <span className="rounded-md border border-black/10 px-3 py-1 text-sm font-bold text-[#3d4451]">
              {eventStatusLabels[event.status as keyof typeof eventStatusLabels] ??
                event.status}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black">{event.title}</h1>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[#2f3542]">
              {event.description}
            </p>
          </div>

          <div className="grid gap-3 rounded-md bg-[#f5f7fb] p-4 text-sm font-semibold text-[#3d4451] md:grid-cols-2">
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[var(--teal)]" />
              开始：{formatDateTime(event.startTime)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--teal)]" />
              已通过：{approvedCount}/{event.maxParticipants}
            </span>
            {event.signupDeadline ? (
              <span className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[var(--teal)]" />
                截止：{formatDateTime(event.signupDeadline)}
              </span>
            ) : null}
            {event.voiceChannel ? (
              <span className="inline-flex items-center gap-2">
                <Mic className="h-4 w-4 text-[var(--teal)]" />
                语音：{event.voiceChannel}
              </span>
            ) : null}
          </div>

          {event.requirements ? (
            <div className="rounded-md border border-black/10 p-4">
              <h2 className="inline-flex items-center gap-2 text-base font-black">
                <Info className="h-4 w-4 text-[var(--teal)]" />
                参与要求
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                {event.requirements}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">报名</h2>

          {query.registered ? (
            <Notice tone="success">报名已提交，等待管理员审核。</Notice>
          ) : null}
          {query.cancelled ? (
            <Notice tone="info">报名已取消。</Notice>
          ) : null}
          {query.error === "profile" ? (
            <Notice tone="warning">账号和资料通过审核后才能报名。</Notice>
          ) : null}
          {query.error === "full" ? (
            <Notice tone="warning">活动名额已满。</Notice>
          ) : null}

          {!user ? (
            <div className="mt-4 grid gap-3">
              <p className="text-sm leading-6 text-[var(--muted)]">
                登录后可提交报名，报名仍需管理员审核。
              </p>
              <Link
                href="/login"
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md bg-[#181a20] px-4 py-2 text-sm font-black text-white hover:bg-black"
              >
                登录
              </Link>
            </div>
          ) : userRegistration && userRegistration.status !== "CANCELLED" ? (
            <div className="mt-4 grid gap-3">
              <p className="rounded-md bg-[#f5f7fb] px-3 py-2 text-sm font-bold">
                当前状态：
                {registrationStatusLabels[userRegistration.status]}
              </p>
              <form action={cancelRegistrationAction}>
                <input type="hidden" name="eventId" value={event.id} />
                <ActionButton className="w-full border border-black/10 bg-white text-[#3d4451] hover:bg-black/5">
                  取消报名
                </ActionButton>
              </form>
            </div>
          ) : (
            <form action={registerEventAction} className="mt-4 grid gap-4">
              <input type="hidden" name="eventId" value={event.id} />
              <label className="grid gap-2 text-sm font-semibold">
                想玩的位置
                <select
                  className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
                  name="preferredRole"
                  defaultValue=""
                  disabled={!open || Boolean(deadlinePassed) || !joinAllowed}
                >
                  <option value="">暂不选择</option>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                可用英雄
                <input
                  className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
                  name="heroes"
                  placeholder="安娜，猎空，温斯顿"
                  disabled={!open || Boolean(deadlinePassed) || !joinAllowed}
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="voiceAvailable"
                  className="h-4 w-4"
                  disabled={!open || Boolean(deadlinePassed) || !joinAllowed}
                />
                可以语音
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                备注
                <textarea
                  className="focus-ring min-h-24 resize-y rounded-md border border-black/15 px-3 py-2 text-base"
                  name="note"
                  disabled={!open || Boolean(deadlinePassed) || !joinAllowed}
                />
              </label>
              <ActionButton
                className="bg-[var(--orange)] text-white hover:bg-[#dd6815]"
                pendingLabel="提交中"
              >
                {open && !deadlinePassed && joinAllowed
                  ? "提交报名"
                  : "暂不可报名"}
              </ActionButton>
            </form>
          )}
        </section>

        <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">已通过玩家</h2>
          <div className="mt-4 grid gap-3">
            {event.registrations?.length ? (
              event.registrations.map((registration) => {
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
                    className="flex items-center gap-3 rounded-md bg-[#f5f7fb] p-3"
                  >
                    <Avatar src={profile?.avatarUrl} name={name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{name}</p>
                      <p className="text-xs font-semibold text-[var(--muted)]">
                        {preferredRole
                          ? roleLabels[
                              preferredRole as keyof typeof roleLabels
                            ]
                          : "未选择位置"}
                      </p>
                    </div>
                    <CheckCircle2 className="ml-auto h-4 w-4 text-[var(--green)]" />
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--muted)]">暂无通过报名。</p>
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}

function isPastDate(date?: Date | null) {
  return Boolean(date && date.getTime() < Date.now());
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "warning" | "info";
}) {
  const styles = {
    success: "border-[var(--green)]/30 bg-green-50 text-[#387a47]",
    warning: "border-[var(--orange)]/30 bg-orange-50 text-[#9b4f12]",
    info: "border-[var(--teal)]/30 bg-cyan-50 text-[#0c6f7b]",
  };

  return (
    <p className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${styles[tone]}`}>
      {children}
    </p>
  );
}
