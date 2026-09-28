"use client";

import { Button, Spinner, type ButtonProps } from "@heroui/react";
import { useFormStatus } from "react-dom";

type ActionButtonProps = Omit<ButtonProps, "children"> & {
  children: React.ReactNode;
  pendingLabel?: string;
};

export function ActionButton({
  children,
  pendingLabel = "处理中",
  isDisabled,
  ...props
}: ActionButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      isDisabled={isDisabled || pending}
      isPending={pending}
    >
      {pending ? (
        <Spinner size="sm" color="current" aria-hidden="true" />
      ) : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
