import { PlayerCard } from "@/components/profile-card";
import { getPublicProfiles } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const profiles = await getPublicProfiles();

  return (
    <main className="page-shell grid gap-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
          Players
        </p>
        <h1 className="mt-1 text-3xl font-black">玩家展示</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          这里只展示审核通过的公开资料：头像、昵称和宣言。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <PlayerCard key={profile.id} profile={profile} />
        ))}
      </div>
    </main>
  );
}
