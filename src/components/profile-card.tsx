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
    <Card
      className="player-card grid h-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-4"
      data-role={profile.mainRole}
    >
      <Avatar
        src={profile.avatarUrl}
        name={profile.displayName}
        shape="square"
      />
      <div className="grid min-w-0 content-start gap-2 [overflow-wrap:anywhere]">
        <h3 className="font-semibold">{profile.displayName}</h3>
        {profile.mainRole ? (
          <p className="text-sm text-muted">
            {roleLabels[profile.mainRole as keyof typeof roleLabels] ??
              profile.mainRole}
          </p>
        ) : null}
        {profile.slogan.trim() ? (
          <p className="text-sm leading-6 text-muted">{profile.slogan}</p>
        ) : null}
        {profile.mainHeroes?.length ? (
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {profile.mainHeroes.slice(0, 4).map((hero, index) => (
              <Chip
                key={hero + index}
                size="sm"
                variant="secondary"
                className="max-w-full"
              >
                <span className="truncate">{hero}</span>
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
