import { BadgeCheck } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { roleLabels } from "@/lib/format";

type PlayerCardProps = {
  profile: {
    avatarUrl?: string | null;
    displayName: string;
    slogan: string;
    mainRole?: string | null;
    mainHeroes?: readonly string[];
  };
};

export function PlayerCard({ profile }: PlayerCardProps) {
  return (
    <article className="grid min-h-36 gap-4 rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar src={profile.avatarUrl} name={profile.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-black">{profile.displayName}</h3>
            <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--green)]" />
          </div>
          {profile.mainRole ? (
            <p className="mt-1 text-sm font-semibold text-[var(--teal)]">
              {roleLabels[profile.mainRole as keyof typeof roleLabels] ??
                profile.mainRole}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-sm leading-6 text-[#2f3542]">{profile.slogan}</p>
      {profile.mainHeroes?.length ? (
        <div className="flex flex-wrap gap-2">
          {profile.mainHeroes.slice(0, 4).map((hero) => (
            <span
              key={hero}
              className="rounded-md border border-black/10 bg-[#f5f7fb] px-2 py-1 text-xs font-semibold text-[#3d4451]"
            >
              {hero}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
