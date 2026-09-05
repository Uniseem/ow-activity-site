import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Crosshair,
  ShieldCheck,
  Users,
} from "lucide-react";
import { EventCard } from "@/components/event-card";
import { PlayerCard } from "@/components/profile-card";
import { EmptyState } from "@/components/page-heading";
import { ButtonLink, Capacity, Card, StatusChip } from "@/components/ui";
import { getHomeData } from "@/lib/data";
import { eventStatusLabels, eventTypeLabel } from "@/lib/format";
import { shanghaiDateValue } from "@/lib/event-date";
import { getSiteText } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export default async function Home() {
  const [{ events, profiles, isDemo }, t] = await Promise.all([
    getHomeData(),
    getSiteText(),
  ]);
  const featured = events[0];
  const date = featured
    ? shanghaiDateValue(featured.startTime).split("-")
    : null;
  return (
    <main className="page-shell">
      <div className="home-intro">
        <span>
          欢迎来到 <strong>{t("brand.name")}</strong>
        </span>
        <time dateTime={shanghaiDateValue()}>
          {new Intl.DateTimeFormat("zh-CN", {
            timeZone: "Asia/Shanghai",
            month: "long",
            day: "numeric",
            weekday: "long",
          }).format(new Date())}
        </time>
      </div>
      <div className="home-lead-grid">
        <section className="hero-panel" aria-labelledby="welcome-title">
          <div className="hero-content">
            <p className="hero-kicker">
              <Crosshair size={14} />
              {t("home.eyebrow")}
            </p>
            <h1 id="welcome-title" className="hero-title">
              {t("home.title1")}
              {t("home.title2") ? (
                <>
                  <br />
                  {t("home.title2")}
                </>
              ) : null}
            </h1>
            <p className="mt-5 max-w-xs whitespace-pre-line text-xs leading-6 text-white/70">
              {t("home.description")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink
                href="/events"
                className="bg-white text-zinc-900 hover:bg-white/90"
              >
                寻找下一场活动
                <ArrowUpRight size={16} />
              </ButtonLink>
              <ButtonLink
                href="/players"
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                发现玩家
              </ButtonLink>
            </div>
          </div>
          <span className="hero-caption">
            <Crosshair size={12} />
            READY WHEN YOU ARE
          </span>
        </section>
        <Card className="spotlight-card">
          <div className="spotlight-label">
            <span>{isDemo ? "活动预览" : "下一场集结"}</span>
            {featured ? (
              <StatusChip
                status={featured.status}
                label={
                  eventStatusLabels[
                    featured.status as keyof typeof eventStatusLabels
                  ]
                }
              />
            ) : (
              <CalendarDays size={17} />
            )}
          </div>
          {featured && date ? (
            <>
              <div className="spotlight-date">
                <strong>{date[2]}</strong>
                <span>
                  {Number(date[1])} 月 · {date[0]}
                  <br />
                  {eventTypeLabel(featured)}
                </span>
              </div>
              <h2 className="text-xl font-bold leading-snug tracking-tight">
                {featured.title}
              </h2>
              <p className="mt-3 line-clamp-2 text-xs leading-6 text-muted">
                {featured.description}
              </p>
              <div className="mb-4 mt-auto pt-5">
                <Capacity
                  count={featured.registrations?.length ?? 0}
                  max={featured.maxParticipants}
                />
              </div>
              <ButtonLink
                href={`/events/${featured.id}`}
                className="w-full justify-between"
              >
                查看活动详情
                <ArrowRight size={16} />
              </ButtonLink>
            </>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-4 py-5">
              <h2 className="text-2xl font-semibold">
                下一次集结，
                <br />
                等你加入。
              </h2>
              <p className="text-sm leading-7 text-muted">
                新的活动会在这里发布。先完善资料，准备好你的玩家卡片。
              </p>
              <ButtonLink
                href="/me"
                variant="secondary"
                className="mt-3 justify-between"
              >
                完善玩家资料
                <ArrowUpRight size={16} />
              </ButtonLink>
            </div>
          )}
        </Card>
      </div>
      <div className="home-body-grid">
        <section aria-labelledby="home-events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / UPCOMING</p>
              <h2 id="home-events" className="section-title">
                值得期待的下一场
              </h2>
            </div>
            <ButtonLink href="/events" variant="ghost" size="sm">
              全部活动
              <ArrowUpRight size={14} />
            </ButtonLink>
          </div>
          {events.length ? (
            <div className="event-grid home-event-grid">
              {events.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="新的活动正在准备"
              description="活动发布后就会出现在这里。先认识几位队友，下一场一起加入。"
              action={
                <ButtonLink href="/players" variant="secondary">
                  发现玩家
                </ButtonLink>
              }
            />
          )}
        </section>
        <aside aria-label="加入社区指南">
          <div className="section-heading">
            <div>
              <p className="eyebrow">GET STARTED</p>
              <h2 className="section-title">第一次来？从这里开始</h2>
            </div>
          </div>
          <Card className="guide-card">
            <div className="guide-steps">
              {[
                {
                  title: "创建玩家卡片",
                  description: "写下昵称、擅长位置和开黑宣言。",
                },
                {
                  title: "等待资料审核",
                  description: "通过审核后，就可以提交活动报名。",
                },
                {
                  title: "选一场，一起上场",
                  description: "找到喜欢的玩法，报名后查看审核结果。",
                },
              ].map((step, index) => (
                <div className="guide-step" key={step.title}>
                  <span>0{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <ButtonLink
              href="/me"
              variant="secondary"
              className="w-full justify-between"
            >
              我的玩家卡片
              <ArrowUpRight size={15} />
            </ButtonLink>
          </Card>
          <div className="mt-4 flex items-start gap-2 px-2 text-[11px] leading-6 text-muted">
            <ShieldCheck size={15} className="mt-1 shrink-0" />
            社区采用资料与报名审核，让每次组队都有准备。
          </div>
        </aside>
      </div>
      <section aria-labelledby="home-players">
        <div className="section-heading">
          <div>
            <p className="eyebrow">02 / THE COMMUNITY</p>
            <h2 id="home-players" className="section-title">
              下一位默契队友，就在这里
            </h2>
          </div>
          <ButtonLink href="/players" variant="ghost" size="sm">
            认识更多玩家
            <ArrowUpRight size={14} />
          </ButtonLink>
        </div>
        {profiles.length ? (
          <div className="player-grid">
            {profiles.slice(0, 6).map((profile) => (
              <PlayerCard key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="成为社区的第一位队友"
            description="完善资料并通过审核，你的玩家卡片就会出现在这里。"
            action={
              <ButtonLink href="/register">
                加入社区
                <Users size={15} />
              </ButtonLink>
            }
          />
        )}
      </section>
    </main>
  );
}
