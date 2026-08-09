import { Check, Mic, UserRound, X } from "lucide-react";
import { notFound } from "next/navigation";

import {
  reviewRegistrationAction,
  updateEventAction,
} from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { Avatar } from "@/components/avatar";
import { EventForm } from "@/components/event-form";
import { requireAdmin } from "@/lib/auth";
import {
  formatDateTime,
  registrationStatusLabels,
  roleLabels,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminEventPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminEventPage({
  params,
  searchParams,
}: AdminEventPageProps) {
  await requireAdmin();
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            include: { profile: true },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const approvedCount = event.registrations.filter(
    (registration) => registration.status === "APPROVED",
  ).length;

  return (
    <main className="page-shell grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-black">{event.title}</h1>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
            {formatDateTime(event.startTime)} · 已通过 {approvedCount}/
            {event.maxParticipants}
          </p>
        </div>
      </div>

      {query.saved ? (
        <p className="rounded-md border border-[var(--green)]/30 bg-green-50 px-4 py-3 text-sm font-semibold text-[#387a47]">
          活动已保存。
        </p>
      ) : null}
      {query.error === "full" ? (
        <p className="rounded-md border border-[var(--orange)]/30 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#9b4f12]">
          已达到人数上限，不能继续通过报名。
        </p>
      ) : null}

      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">活动设置</h2>
        <div className="mt-5">
          <EventForm action={updateEventAction} event={event} />
        </div>
      </section>

      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">报名审核</h2>
        <div className="mt-5 grid gap-3">
          {event.registrations.length ? (
            event.registrations.map((registration) => {
              const profile = registration.user.profile;
              const name = profile?.displayName ?? registration.user.username;

              return (
                <article
                  key={registration.id}
                  className="grid gap-4 rounded-md border border-black/10 p-4 lg:grid-cols-[1fr_240px]"
                >
                  <div className="flex gap-4">
                    <Avatar src={profile?.avatarUrl} name={name} size="md" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{name}</h3>
                        <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-bold">
                          {registrationStatusLabels[registration.status]}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-[var(--muted)]">
                        <span className="inline-flex items-center gap-2">
                          <UserRound className="h-4 w-4" />
                          {registration.preferredRole
                            ? roleLabels[registration.preferredRole]
                            : "未选择位置"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Mic className="h-4 w-4" />
                          {registration.voiceAvailable ? "可以语音" : "不能语音"}
                        </span>
                        <span>
                          可用英雄：
                          {registration.heroes.length
                            ? registration.heroes.join("，")
                            : "未填写"}
                        </span>
                        {registration.note ? (
                          <span>备注：{registration.note}</span>
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
                      className="bg-[var(--green)] text-white hover:bg-[#3f884f]"
                    >
                      <Check className="h-4 w-4" />
                      通过报名
                    </ActionButton>
                    <ActionButton
                      name="decision"
                      value="REJECTED"
                      className="bg-[var(--red)] text-white hover:bg-[#aa4444]"
                    >
                      <X className="h-4 w-4" />
                      拒绝报名
                    </ActionButton>
                  </form>
                </article>
              );
            })
          ) : (
            <p className="text-sm text-[var(--muted)]">暂无报名。</p>
          )}
        </div>
      </section>
    </main>
  );
}
