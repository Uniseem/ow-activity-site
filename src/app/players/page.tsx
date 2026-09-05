import { Search, Users } from "lucide-react";
import Link from "next/link";
import { PlayerCard } from "@/components/profile-card";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { Button, ButtonLink, Chip, InputField } from "@/components/ui";
import { getPublicProfiles } from "@/lib/data";
import { roleLabels } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const [allProfiles, query] = await Promise.all([
    getPublicProfiles(),
    searchParams,
  ]);
  const role =
    query.role && Object.hasOwn(roleLabels, query.role) ? query.role : "all";
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const profiles = allProfiles.filter(
    (profile) =>
      (role === "all" || profile.mainRole === role) &&
      (!q ||
        `${profile.displayName} ${profile.slogan} ${profile.mainHeroes.join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="社区成员"
        title="好队友，从认识开始。"
        description="有人擅长冲锋，有人守护后排。看看大家的玩家卡片，找到合拍的那一位。"
        action={
          <Chip variant="secondary">
            <Users size={14} />
            {allProfiles.length} 位玩家
          </Chip>
        }
      />
      <div className="directory-toolbar">
        <nav aria-label="玩家位置筛选" className="directory-filters">
          {Object.entries({ all: "全部位置", ...roleLabels }).map(
            ([value, label]) => {
              const params = new URLSearchParams();
              if (value !== "all") params.set("role", value);
              if (q) params.set("q", q);
              return (
                <Link
                  key={value}
                  href={`/players${params.size ? "?" + params.toString() : ""}`}
                  aria-current={role === value ? "page" : undefined}
                  className={`filter-link ${role === value ? "active" : ""}`}
                >
                  {label}
                </Link>
              );
            },
          )}
        </nav>
        <form action="/players" method="get" className="directory-search">
          <input type="hidden" name="role" value={role} />
          <InputField
            key={q}
            label="搜索玩家"
            name="q"
            defaultValue={q}
            placeholder="昵称、常用英雄…"
            maxLength={100}
          />
          <Button type="submit" variant="secondary" aria-label="搜索玩家">
            <Search size={17} />
          </Button>
        </form>
      </div>
      <p className="directory-count">
        {q ? `“${q}” · ` : ""}
        {profiles.length} 位玩家 · 仅展示已通过审核的公开资料
      </p>
      {profiles.length ? (
        <div className="player-grid">
          {profiles.map((profile) => (
            <PlayerCard key={profile.id} profile={profile} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={q || role !== "all" ? "暂时没有匹配的玩家" : "队友们正在集结"}
          description={
            q || role !== "all"
              ? "试试其他关键词或位置。"
              : "完善你的玩家卡片，审核通过后就能在这里与大家见面。"
          }
          action={
            <ButtonLink
              href={q || role !== "all" ? "/players" : "/me"}
              variant="secondary"
            >
              {q || role !== "all" ? "查看全部玩家" : "创建我的玩家卡片"}
            </ButtonLink>
          }
        />
      )}
    </main>
  );
}
