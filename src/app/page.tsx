import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Crosshair,
  Gamepad2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { PlayerCard } from "@/components/profile-card";
import { ButtonLink, StatusChip } from "@/components/ui";
import { getHomeData } from "@/lib/data";
import { eventStatusLabels, eventTypeLabel } from "@/lib/format";
import { formatEventDate, shanghaiDateValue } from "@/lib/event-date";
import { getSiteText } from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export default async function Home() {
  const [{ events, profiles, isDemo }, t] = await Promise.all([
    getHomeData(),
    getSiteText(),
  ]);
  const upcoming = events.toSorted(
    (a, b) =>
      Number(b.status === "RUNNING") - Number(a.status === "RUNNING") ||
      a.startTime.getTime() - b.startTime.getTime(),
  );
  const featured = upcoming[0];
  const date = featured
    ? shanghaiDateValue(featured.startTime).split("-")
    : null;
  return (
    <main className="page-shell campus-home">
      <section className="campus-hero" aria-labelledby="welcome-title">
        <div className="campus-hero-copy">
          <p className="campus-eyebrow">
            <span />
            {t("home.eyebrow")}
          </p>
          <h1 id="welcome-title">
            {t("home.title1")}
            {t("home.title2") ? (
              <>
                <br />
                <em>{t("home.title2")}</em>
              </>
            ) : null}
          </h1>
          <p className="campus-hero-description">{t("home.description")}</p>
          <div className="campus-hero-actions">
            <ButtonLink href="/events" size="lg">
              看看最近的活动
              <ArrowRight size={17} />
            </ButtonLink>
            <Link href="/me" className="text-action">
              加入玩家社区
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <p className="campus-hero-note">课余的一局，从认识交大队友开始。</p>
        </div>
        <div className="campus-art" aria-hidden="true">
          <div className="campus-art-top">
            <span>{t("brand.badge")}</span>
            <Crosshair size={27} strokeWidth={1} />
          </div>
          <div className="campus-art-bottom">
            <span>课 后 上 线</span>
            <strong>交大集结。</strong>
            <small>SEE YOU IN GAME.</small>
          </div>
        </div>
      </section>
      <div className="campus-play-strip">
        <span>
          <Gamepad2 size={17} />
          你喜欢的玩法，这里一起玩
        </span>
        <nav aria-label="按玩法寻找活动">
          {["内战", "娱乐赛", "训练赛", "观赛"].map((type) => (
            <Link key={type} href={`/events?q=${encodeURIComponent(type)}`}>
              {type}
              <ArrowUpRight size={12} />
            </Link>
          ))}
        </nav>
      </div>

      <section className="campus-section" aria-labelledby="home-events">
        <div className="section-heading">
          <div>
            <p className="campus-eyebrow">MEET IN GAME</p>
            <h2 id="home-events" className="section-title">
              最近有什么活动？
            </h2>
            <p className="section-description">
              留一个课余时段，和交大队友一起上场。
            </p>
          </div>
          <Link href="/events" className="text-action">
            全部活动
            <ArrowUpRight size={16} />
          </Link>
        </div>
        {featured && date ? (
          <>
            <div className="campus-featured">
              <div className="campus-featured-date">
                <span>{Number(date[1])} 月</span>
                <strong>{date[2]}</strong>
                <small>{date[0]}</small>
              </div>
              <div className="campus-featured-info">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-accent">
                    {isDemo ? "活动预览" : "近期推荐"} ·{" "}
                    {eventTypeLabel(featured)}
                  </span>
                  <StatusChip
                    status={featured.status}
                    label={
                      eventStatusLabels[
                        featured.status as keyof typeof eventStatusLabels
                      ]
                    }
                  />
                </div>
                <h3>
                  <Link href={`/events/${featured.id}`}>{featured.title}</Link>
                </h3>
                <p>{featured.description}</p>
                <span className="campus-featured-meta">
                  <CalendarDays size={14} />
                  {formatEventDate(featured.startTime)}
                  <span>·</span>
                  {featured.registrations?.length ?? 0} /{" "}
                  {featured.maxParticipants} 人已加入
                </span>
              </div>
              <ButtonLink href={`/events/${featured.id}`}>
                详情与报名
                <ArrowRight size={16} />
              </ButtonLink>
            </div>
            {upcoming.length > 1 ? (
              <div className="event-grid campus-more-events">
                {upcoming.slice(1, 4).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="campus-empty-event">
            <CalendarDays size={35} strokeWidth={1.3} />
            <div>
              <h3>下一场活动，等你一起。</h3>
              <p>
                这里还没有发布活动。可以先完善玩家资料，认识一起开黑的交大同学。
              </p>
            </div>
            <ButtonLink href="/me" variant="secondary">
              完善我的资料
              <ArrowUpRight size={15} />
            </ButtonLink>
          </div>
        )}
      </section>

      <section className="campus-section" aria-labelledby="home-players">
        <div className="section-heading">
          <div>
            <p className="campus-eyebrow">YOUR CAMPUS, YOUR TEAM</p>
            <h2 id="home-players" className="section-title">
              原来你也在交大玩守望。
            </h2>
            <p className="section-description">
              认识校园里的重装、输出和支援，下一局不再一个人排。
            </p>
          </div>
          <Link href="/players" className="text-action">
            认识更多队友
            <ArrowUpRight size={16} />
          </Link>
        </div>
        {profiles.length ? (
          <div className="player-grid">
            {profiles.slice(0, 3).map((profile) => (
              <PlayerCard key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <div className="campus-players-empty">
            <Users size={28} strokeWidth={1.3} />
            <p>写下你的常用英雄和开黑宣言，让交大队友认识你。</p>
            <Link href="/me" className="text-action">
              创建玩家卡片
              <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </section>

      <section
        className="campus-about"
        id="about-community"
        aria-labelledby="about-title"
      >
        <div className="campus-about-intro">
          <p className="campus-eyebrow">ABOUT US</p>
          <h2 id="about-title">
            因为守望相遇，
            <br />
            也因为我们都在交大。
          </h2>
          <p>
            这里是上海交大守望先锋玩家的社区。课后开黑、约一场内战，或一起看比赛，把游戏里的配合变成校园里熟悉的招呼。
          </p>
          <p>
            刚入坑，还是已经征战多个赛季，都欢迎来认识队友。我们因共同的爱好聚在这里。
          </p>
          <Link href="/me" className="text-action">
            加入我们
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="campus-join">
          <h3>第一次来，三步加入</h3>
          {[
            {
              title: "留一张玩家名片",
              description: "创建账号，填写昵称、位置和常用英雄。",
              href: "/me",
            },
            {
              title: "挑一场想参加的活动",
              description: "资料审核通过后，查看活动安排并报名。",
              href: "/events",
            },
            {
              title: "确认报名，准时见面",
              description: "在个人中心查看报名结果，按活动说明参加。",
              href: "/me#my-activities",
            },
          ].map((step, index) => (
            <Link
              key={step.title}
              href={step.href}
              className="campus-join-step"
            >
              <span>0{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.description}</p>
              </div>
              <ArrowUpRight size={16} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
