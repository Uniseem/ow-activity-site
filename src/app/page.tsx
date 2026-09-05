import {
  ArrowRight,
  CalendarDays,
  Crosshair,
  ShieldCheck,
  Users,
} from "lucide-react";
import { EventCard } from "@/components/event-card";
import { PlayerCard } from "@/components/profile-card";
import { EmptyState } from "@/components/page-heading";
import { ButtonLink, Card, StatusChip } from "@/components/ui";
import { getHomeData } from "@/lib/data";
import { eventStatusLabels } from "@/lib/format";
import { formatEventDate } from "@/lib/event-date";
import { getSiteText } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { events, profiles, isDemo } = await getHomeData();
  const t = await getSiteText();
  const featuredEvent = events[0];
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-content">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-widest text-white/65">
              <Crosshair size={16} />
              {t("home.eyebrow")}
            </div>
            <h1 className="hero-title">
              {t("home.title1")}
              {t("home.title2") ? (
                <>
                  <br />
                  {t("home.title2")}
                </>
              ) : null}
            </h1>
            <p className="mt-5 max-w-sm whitespace-pre-line text-sm leading-7 text-white/65">
              {t("home.description")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/events" size="lg">
                <CalendarDays size={17} />
                探索活动
                <ArrowRight size={17} />
              </ButtonLink>
              <ButtonLink
                href="/players"
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10"
              >
                认识玩家
              </ButtonLink>
            </div>
            <p className="mt-7 flex items-center gap-2 text-[11px] text-white/50">
              <ShieldCheck size={14} />
              审核制社区 · 为热爱相聚
            </p>
          </div>
          <div className="hero-feature">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-medium tracking-widest text-white/55">
                {isDemo ? "活动预览" : "近期活动"}
              </span>
              {featuredEvent ? (
                <StatusChip
                  status={featuredEvent.status}
                  label={
                    eventStatusLabels[
                      featuredEvent.status as keyof typeof eventStatusLabels
                    ]
                  }
                  className="bg-white/15 text-white"
                />
              ) : (
                <Crosshair size={18} className="text-white/50" />
              )}
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              {featuredEvent?.title ?? "下一次集结，等你加入"}
            </h2>
            <p className="mt-3 line-clamp-2 text-sm leading-7 text-white/60">
              {featuredEvent?.description ??
                "完善你的玩家资料，认识新队友。新的社区活动将在这里发布。"}
            </p>
            {featuredEvent ? (
              <p className="mt-5 flex items-center gap-2 text-xs text-white/80">
                <CalendarDays size={15} />
                {formatEventDate(featuredEvent.startTime)}
              </p>
            ) : null}
            <div className="mt-6 border-t border-white/15 pt-5">
              <ButtonLink
                href={
                  featuredEvent ? "/events/" + featuredEvent.id : "/register"
                }
                variant="secondary"
                className="w-full justify-between bg-white text-zinc-800 hover:bg-white/90"
              >
                {featuredEvent ? "查看活动详情" : "创建玩家资料"}
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
      <section aria-labelledby="home-events">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Get together</p>
            <h2 id="home-events" className="section-title">
              下一场，一起上场
            </h2>
          </div>
          <ButtonLink href="/events" variant="ghost" size="sm">
            全部活动
            <ArrowRight size={15} />
          </ButtonLink>
        </div>
        {events.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="新活动正在路上"
            description="活动发布后，会出现在这里。先去认识一下未来的队友吧。"
            action={
              <ButtonLink href="/players" variant="secondary">
                发现玩家
              </ButtonLink>
            }
          />
        )}
      </section>
      <section aria-labelledby="home-players">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Meet the players</p>
            <h2 id="home-players" className="section-title">
              你的下一位默契队友
            </h2>
          </div>
          <ButtonLink href="/players" variant="ghost" size="sm">
            所有玩家
            <ArrowRight size={15} />
          </ButtonLink>
        </div>
        {profiles.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profiles.map((profile) => (
              <PlayerCard key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="等你成为第一位队友"
            description="注册并完善资料，审核通过后就能在这里与大家见面。"
            action={<ButtonLink href="/register">加入社区</ButtonLink>}
          />
        )}
      </section>
      <Card className="mt-8 flex-row flex-wrap items-center justify-between gap-5 border border-border bg-surface p-6 shadow-none">
        <div className="flex items-center gap-4">
          <span className="icon-tile shrink-0">
            <Users size={22} />
          </span>
          <div>
            <h2 className="font-semibold">热爱相同，组队就简单。</h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              从一张玩家卡片开始，让下一场开黑有你的位置。
            </p>
          </div>
        </div>
        <ButtonLink href="/me" variant="secondary" size="sm">
          完善我的资料
          <ArrowRight size={15} />
        </ButtonLink>
      </Card>
    </main>
  );
}
