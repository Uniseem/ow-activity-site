"use client";

import { Avatar as HeroAvatar } from "@heroui/react";
import { getInitials } from "@/lib/format";

export function Avatar({
  src,
  name,
  size = "md",
  shape = "default",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  shape?: "default" | "square";
}) {
  return (
    <HeroAvatar
      size={size}
      color="accent"
      className={
        shape === "square"
          ? "aspect-square h-auto w-full shrink-0 rounded-2xl"
          : "shrink-0"
      }
    >
      {src ? (
        <HeroAvatar.Image
          src={src}
          alt={name + " 的头像"}
          className={shape === "square" ? "object-cover" : undefined}
        />
      ) : null}
      <HeroAvatar.Fallback
        className={shape === "square" ? "text-3xl" : undefined}
      >
        {getInitials(name)}
      </HeroAvatar.Fallback>
    </HeroAvatar>
  );
}
