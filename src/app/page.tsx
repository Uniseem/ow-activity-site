import { ArrowRight, CalendarDays, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { EventCard } from "@/components/event-card";
import { PlayerCard } from "@/components/profile-card";
import { getHomeData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { events, profiles } = await getHomeData();
  const featuredEvent = events[0];

  return (
    <main>
      <section className="relative overflow-hidden bg-[#181a20] text-white">
        <div className="absolute inset-0 bg-[url('/arena-cover.png')] bg-cover bg-center opacity-35" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="page-shell relative grid min-h-[360px] gap-8 py-10 md:grid-cols-[1fr_360px] md:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                审核制
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1 text-sm font-bold backdrop-blur">
                <Users className="h-4 w-4" />
                小圈子
              </span>
            </div>
            <h1 className="max-w-[760px] text-4xl font-black leading-tight sm:text-5xl">
              守望先锋玩家活动站
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/85">
              公开卡片只展示头像、昵称和宣言；详细资料与活动报名由管理员审核。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/events"
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--orange)] px-4 py-2 text-sm font-black text-white hover:bg-[#dd6815]"
              >
                <CalendarDays className="h-4 w-4" />
                看活动
              </Link>
              <Link
                href="/register"
                className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-black text-[#181a20] hover:bg-white/90"
              >
                注册
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {featuredEvent ? (
            <div className="rounded-md border border-white/20 bg-white/12 p-4 backdrop-blur">
              <p className="text-sm font-bold text-white/70">当前活动</p>
              <h2 className="mt-2 text-2xl font-black">{featuredEvent.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/80">
                {featuredEvent.description}
              </p>
              <Link
                href={`/events/${featuredEvent.id}`}
                className="focus-ring mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-black text-[#181a20] hover:bg-white/90"
              >
                查看报名
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="page-shell grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
              Events
            </p>
            <h2 className="mt-1 text-2xl font-black">正在推进的活动</h2>
          </div>
          <Link
            href="/events"
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-bold hover:bg-black/5"
          >
            全部活动
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      <section className="page-shell grid gap-5 pt-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
              Players
            </p>
            <h2 className="mt-1 text-2xl font-black">已审核玩家</h2>
          </div>
          <Link
            href="/players"
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm font-bold hover:bg-black/5"
          >
            玩家列表
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {profiles.map((profile) => (
            <PlayerCard key={profile.id} profile={profile} />
          ))}
        </div>
      </section>
    </main>
  );
}
