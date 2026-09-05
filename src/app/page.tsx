import { EventCard } from "@/components/event-card";
import { PlayerCard } from "@/components/profile-card";
import { PlayerCarousel } from "@/components/player-carousel";
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
        <div className="home-intro-copy">
          <h1 id="welcome-title">
            <span>{t("home.title1")}</span>
            <span>{t("home.title2")}</span>
          </h1>
          <p className="home-description">{t("home.description")}</p>
        </div>
        {customImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- 管理员设置的首页配图
          <img className="home-custom-image" src={customImage} alt="社区配图" />
        ) : (
          <ButtonLink href="/events" className="home-join">
            查看活动
          </ButtonLink>
        )}
      </section>
      {isDemo ? (
        <Notice>当前为页面演示，连接数据库后展示真实活动和玩家。</Notice>
      ) : null}
      <div className="home-content-grid">
        <section className="home-section" aria-labelledby="home-events">
          <div className="section-heading">
            <h2 id="home-events" className="section-title">
              近期活动
            </h2>
            <ButtonLink href="/events" variant="ghost" size="sm">
              全部活动
            </ButtonLink>
          </div>
          {upcoming.length ? (
            <div className="home-card-list">
              {upcoming.slice(0, 3).map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant={index === 0 ? "featured" : "compact"}
                />
              ))}
            </div>
          ) : (
            <Card className="home-empty">
              <p>暂无近期活动。</p>
            </Card>
          )}
        </section>
        <section className="home-section" aria-labelledby="home-articles">
          <div className="section-heading">
            <h2 id="home-articles" className="section-title">
              最新文章
            </h2>
            <ButtonLink href="/articles" variant="ghost" size="sm">
              全部文章
            </ButtonLink>
          </div>
          {articles.length ? (
            <div className="home-card-list">
              {articles.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant={index === 0 ? "featured" : "compact"}
                />
              ))}
            </div>
          ) : (
            <Card className="home-empty">
              <p>暂无文章。</p>
            </Card>
          )}
        </section>
      </div>
      {profiles.length ? (
        <section className="home-section" aria-labelledby="home-players">
          <div className="section-heading">
            <h2 id="home-players" className="section-title">
              交大玩家
            </h2>
            <ButtonLink href="/players" variant="ghost" size="sm">
              全部玩家
            </ButtonLink>
          </div>
          <PlayerCarousel>
            {profiles.map((profile) => (
              <PlayerCard key={profile.id} profile={profile} />
            ))}
          </PlayerCarousel>
        </section>
      ) : null}
    </main>
  );
}
