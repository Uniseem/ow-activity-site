import { ShieldCheck, Users } from "lucide-react";
import { PlayerCard } from "@/components/profile-card";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { ButtonLink, Chip } from "@/components/ui";
import { getPublicProfiles } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function PlayersPage() {
  const profiles = await getPublicProfiles();
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Find your teammates"
        title="发现玩家"
        description="看看大家的擅长位置与开黑宣言，找到属于你的默契。"
        action={
          <Chip variant="secondary">
            <Users size={14} />
            {profiles.length} 位玩家
          </Chip>
        }
      />
      <div className="mb-6 flex items-start gap-2 text-xs leading-6 text-muted">
        <ShieldCheck size={15} className="mt-1 shrink-0" />
        <p>
          这里展示已审核的玩家资料。战网
          ID、联系方式和其他私密资料仅本人及管理员可见。
        </p>
      </div>
      {profiles.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {profiles.map((profile) => (
            <PlayerCard key={profile.id} profile={profile} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="队友们正在集结"
          description="创建你的玩家卡片，审核通过后就能在这里与大家见面。"
          action={<ButtonLink href="/register">加入社区</ButtonLink>}
        />
      )}
    </main>
  );
}
