import { getInitials } from "@/lib/format";

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-base",
  lg: "h-20 w-20 text-xl",
};

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} 的头像`}
        className={`${sizes[size]} rounded-md border border-black/10 object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} grid place-items-center rounded-md border border-black/10 bg-[#181a20] font-bold text-white`}
      aria-label={`${name} 的头像`}
    >
      {getInitials(name)}
    </div>
  );
}
