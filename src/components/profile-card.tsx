import { BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Card, Chip } from "@/components/ui";
import { roleLabels } from "@/lib/format";

export function PlayerCard({
  profile,
}: {
  profile: {
    avatarUrl?: string | null;
    displayName: string;
    slogan: string;
    mainRole?: string | null;
    mainHeroes?: readonly string[];
  };
}) {
  return (
    <Card className="player-card" data-role={profile.mainRole}>
      <div className="flex items-center gap-3">
        <Avatar src={profile.avatarUrl} name={profile.displayName} />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-semibold">
            <span className="truncate">{profile.displayName}</span>
            <BadgeCheck
              size={16}
              className="shrink-0 text-success"
              aria-label="已审核玩家"
            />
          </h3>
          <p className="mt-1 text-xs text-muted">
            {profile.mainRole
              ? (roleLabels[profile.mainRole as keyof typeof roleLabels] ??
                profile.mainRole)
              : "一起发现更多玩法"}
          </p>
        </div>
      </div>
      <p className="flex-1 text-sm leading-7 text-muted">
        “{profile.slogan || "期待和新队友一起上场。"}”
      </p>
      {profile.mainHeroes?.length ? (
        <div className="flex flex-wrap gap-1.5 border-t border-separator pt-4">
          {profile.mainHeroes.slice(0, 4).map((hero, index) => (
            <Chip key={hero + index} size="sm" variant="secondary">
              {hero}
            </Chip>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
