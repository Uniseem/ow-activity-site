"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

type ActionButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  name?: string;
  value?: string;
};

export function ActionButton({
  children,
  className = "",
  pendingLabel = "处理中",
  name,
  value,
}: ActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${className}`}
    >
      {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
