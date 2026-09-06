"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Description,
  Input,
  Label,
  ListBox,
  ProgressBar,
  Select,
  TextArea,
  buttonVariants,
} from "@heroui/react";
import NextLink from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";

export { Button, Card, Chip };

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  target,
}: {
  href: string;
  children: ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: "sm" | "md" | "lg";
  className?: string;
  target?: ComponentProps<typeof NextLink>["target"];
}) {
  return (
    <NextLink
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={buttonVariants({ variant, size, className })}
    >
      {children}
    </NextLink>
  );
}

type FieldMeta = { label: string; description?: string; error?: string };
export function InputField({
  label,
  description,
  error,
  className,
  id: providedId,
  ...props
}: ComponentProps<typeof Input> & FieldMeta) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helpId = id + "-help";
  return (
    <div className="grid min-w-0 content-start gap-2">
      <Label htmlFor={id}>
        {label}
        {props.required ? (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <Input
        {...props}
        id={id}
        variant="secondary"
        className={"w-full " + (className ?? "")}
        aria-invalid={error ? true : undefined}
        aria-describedby={description || error ? helpId : undefined}
      />
      {error ? (
        <p id={helpId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : description ? (
        <Description id={helpId}>{description}</Description>
      ) : null}
    </div>
  );
}

export function TextAreaField({
  label,
  description,
  error,
  className,
  id: providedId,
  ...props
}: ComponentProps<typeof TextArea> & FieldMeta) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helpId = id + "-help";
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>
        {label}
        {props.required ? (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <TextArea
        {...props}
        id={id}
        variant="secondary"
        className={"min-h-28 w-full " + (className ?? "")}
        aria-invalid={error ? true : undefined}
        aria-describedby={description || error ? helpId : undefined}
      />
      {error ? (
        <p id={helpId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : description ? (
        <Description id={helpId}>{description}</Description>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required,
  disabled,
  placeholder = "请选择",
  onChange,
}: {
  label: string;
  name: string;
  options: Record<string, string>;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange?: ComponentProps<typeof Select>["onChange"];
}) {
  return (
    <Select
      name={name}
      defaultValue={defaultValue ?? null}
      onChange={onChange}
      isRequired={required}
      isDisabled={disabled}
      placeholder={placeholder}
      variant="secondary"
      className="w-full min-w-0"
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {Object.entries(options).map(([value, text]) => (
            <ListBox.Item id={value} key={value} textValue={text}>
              {text}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

export function CheckField({
  children,
  name,
  disabled,
  defaultSelected,
  value = "on",
}: {
  children: ReactNode;
  name: string;
  disabled?: boolean;
  defaultSelected?: boolean;
  value?: string;
}) {
  return (
    <Checkbox
      name={name}
      value={value}
      isDisabled={disabled}
      defaultSelected={defaultSelected}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {children}
      </Checkbox.Content>
    </Checkbox>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  return (
    <Alert
      status={tone === "info" ? "accent" : tone}
      className="w-full"
      role={tone === "danger" ? "alert" : "status"}
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description className="leading-6">{children}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function StatusChip({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  const color = ["APPROVED", "OPEN"].includes(status)
    ? "success"
    : ["REJECTED", "BANNED", "CANCELLED"].includes(status)
      ? "danger"
      : status === "PENDING"
        ? "warning"
        : status === "RUNNING"
          ? "accent"
          : "default";
  return (
    <Chip color={color} variant="soft" size="sm" className={className}>
      {label}
    </Chip>
  );
}

export function Capacity({ count, max }: { count: number; max: number }) {
  return (
    <ProgressBar
      aria-label="已通过报名人数"
      value={count}
      maxValue={max}
      size="sm"
      color="accent"
    >
      <div className="mb-2 flex justify-between text-xs text-muted">
        <span>已加入</span>
        <span className="tabular-nums">
          {count} / {max} 人
        </span>
      </div>
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}
