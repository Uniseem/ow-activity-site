"use client";

import { Avatar as HeroAvatar } from "@heroui/react";
import { getInitials } from "@/lib/format";

export function Avatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <HeroAvatar size={size} color="accent" className="shrink-0">
      {src ? <HeroAvatar.Image src={src} alt={name + " 的头像"} /> : null}
      <HeroAvatar.Fallback>{getInitials(name)}</HeroAvatar.Fallback>
    </HeroAvatar>
  );
}
