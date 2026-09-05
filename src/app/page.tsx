import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { PlayerCard } from "@/components/profile-card";
import { ArticleCard } from "@/components/article-card";
import { ButtonLink, Card, Notice } from "@/components/ui";
import { getLatestArticles } from "@/lib/articles-data";
import { getHomeData } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { createSiteText } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export default async function Home() {
  const [{ events, profiles, isDemo }, { configuration }, articles] =
    await Promise.all([getHomeData(), getSiteSettings(), getLatestArticles()]);
  const t = createSiteText(configuration);
  const upcoming = events.toSorted(
    (a, b) =>
      Number(b.status === "RUNNING") - Number(a.status === "RUNNING") ||
      a.startTime.getTime() - b.startTime.getTime(),
  );
  const customImage =
    configuration.images.hero &&
    !["/arena-v2.webp", "/arena-cover.png"].includes(configuration.images.hero)
      ? configuration.images.hero
      : "";
  return (
    <main className="page-shell community-home">
      <section className="home-intro" aria-labelledby="welcome-title">
        <div>
          <p className="eyebrow">{t("home.eyebrow")}</p>
          <h1 id="welcome-title">
            {t("home.title1")}
            {t("home.title2")}
          </h1>
          <p className="home-description">{t("home.description")}</p>
          <div className="home-actions">
            <ButtonLink href="/events">
              查看活动
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/me" variant="secondary">
              我的资料与报名
            </ButtonLink>
          </div>
        </div>
        {customImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- 管理员设置的首页配图
          <img className="home-custom-image" src={customImage} alt="社区配图" />
        ) : null}
      </section>
      {isDemo ? (
        <Notice>当前为页面演示，连接数据库后展示真实活动和玩家。</Notice>
      ) : null}
      <section className="home-section" aria-labelledby="home-events">
        <div className="section-heading">
          <div>
            <h2 id="home-events" className="section-title">
              近期活动
            </h2>
            <p className="section-description">内战、娱乐赛、训练赛和观赛。</p>
          </div>
          <Link href="/events" className="text-action">
            全部活动
            <ArrowRight size={15} />
          </Link>
        </div>
        {upcoming.length ? (
          <div className="event-grid">
            {upcoming.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <Card className="home-empty">
            <p>暂无近期活动。</p>
            <Link href="/events" className="text-action">
              查看往期活动
            </Link>
          </Card>
        )}
      </section>
      <section className="home-section" aria-labelledby="home-articles">
        <div className="section-heading">
          <div>
            <h2 id="home-articles" className="section-title">
              最新文章
            </h2>
            <p className="section-description">
              社区公告、活动回顾与玩家分享。
            </p>
          </div>
          <Link href="/articles" className="text-action">
            全部文章
            <ArrowRight size={15} />
          </Link>
        </div>
        {articles.length ? (
          <div className="article-grid">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <Card className="home-empty">
            <p>暂无已发布的文章。</p>
          </Card>
        )}
      </section>
      <section className="home-section" aria-labelledby="home-players">
        <div className="section-heading">
          <div>
            <h2 id="home-players" className="section-title">
              交大玩家
            </h2>
            <p className="section-description">
              认识同校队友，找到一起玩的位置。
            </p>
          </div>
          <Link href="/players" className="text-action">
            全部玩家
            <ArrowRight size={15} />
          </Link>
        </div>
        {profiles.length ? (
          <div className="player-grid">
            {profiles.slice(0, 3).map((profile) => (
              <PlayerCard key={profile.id} profile={profile} />
            ))}
          </div>
        ) : (
          <Card className="home-empty">
            <p>完善资料并通过审核后，你的玩家卡片会出现在这里。</p>
            <Link href="/me" className="text-action">
              完善资料
            </Link>
          </Card>
        )}
      </section>
      <section
        className="community-about"
        id="about-community"
        aria-labelledby="about-title"
      >
        <h2 id="about-title" className="section-title">
          关于社区
        </h2>
        <p>
          这里是上海交大守望先锋玩家的社区。欢迎同学们认识队友、报名活动、分享游戏心得。
        </p>
        <p>
          首次参加：注册账号并完善资料，审核通过后即可报名。报名结果与活动安排在个人中心查看。
        </p>
      </section>
    </main>
  );
}
