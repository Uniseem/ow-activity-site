"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Spinner } from "@heroui/react";
import { ArrowUpRight, Save } from "lucide-react";
import { InputField, Notice, TextAreaField } from "@/components/ui";
import { copyFields } from "@/lib/site-copy";
import {
  defaultSiteConfiguration,
  imageFields,
  type SiteConfiguration,
} from "@/lib/site-config";
import {
  saveSiteSettingsAction,
  uploadSiteAssetAction,
} from "@/app/admin/customize/actions";

const groups = [...new Set(copyFields.map((field) => field.group))];

export function SiteEditor({
  initial,
  revision,
}: {
  initial: SiteConfiguration;
  revision: number;
}) {
  const [draft, setDraft] = useState(initial);
  const [uploadCount, setUploadCount] = useState(0);
  const [state, action, pending] = useActionState(
    async (
      previous: {
        ok: boolean;
        message: string;
        revision: number;
        snapshot: string;
      },
      data: FormData,
    ) => {
      const result = await saveSiteSettingsAction(previous, data);
      return {
        ...result,
        revision: result.revision ?? previous.revision,
        snapshot: result.ok
          ? String(data.get("configuration"))
          : previous.snapshot,
      };
    },
    { ok: false, message: "", revision, snapshot: JSON.stringify(initial) },
  );
  const dirty = JSON.stringify(draft) !== state.snapshot;
  const busy = pending || uploadCount > 0;

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  function updateText(key: string, value: string) {
    setDraft((current) => {
      const texts = { ...current.texts };
      if (value === copyFields.find((field) => field.key === key)?.defaultValue)
        delete texts[key];
      else texts[key] = value;
      return { ...current, texts };
    });
  }

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="configuration" value={JSON.stringify(draft)} />
      <input type="hidden" name="revision" value={state.revision} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">保存后，网站会立即使用新的设置。</p>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2 text-sm text-accent"
        >
          查看网站
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {state.message ? (
        <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>
      ) : null}
      {groups.map((group) => (
        <Card
          key={group}
          className="gap-5 border border-border p-5 shadow-none sm:p-7"
        >
          <h2 className="font-semibold">{group}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {copyFields
              .filter((field) => field.group === group)
              .map((field) => {
                const multiline =
                  field.key.endsWith("Description") ||
                  field.key.endsWith("description");
                const Field = multiline ? TextAreaField : InputField;
                return (
                  <div
                    key={field.key}
                    className={multiline ? "sm:col-span-2" : ""}
                  >
                    <Field
                      label={field.label}
                      value={draft.texts[field.key] ?? field.defaultValue}
                      required={field.required}
                      disabled={busy}
                      maxLength={field.key === "brand.name" ? 40 : 1000}
                      onChange={(event) =>
                        updateText(field.key, event.target.value)
                      }
                    />
                  </div>
                );
              })}
          </div>
        </Card>
      ))}
      <Card className="gap-5 border border-border p-5 shadow-none sm:p-7">
        <div>
          <h2 className="font-semibold">品牌图片</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            填写图片链接或直接上传，支持 PNG / JPEG / WebP / GIF，最大 2 MB。
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {imageFields.map((field) => (
            <ImageSetting
              key={field.key}
              label={field.label}
              description={field.description}
              value={draft.images[field.key]}
              defaultValue={field.defaultValue}
              disabled={busy}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  images: { ...current.images, [field.key]: value },
                }))
              }
              onUploadStart={() => setUploadCount((count) => count + 1)}
              onUploadEnd={() => setUploadCount((count) => count - 1)}
            />
          ))}
        </div>
        <div className="flex max-w-sm items-end gap-3 border-t border-separator pt-5">
          <input
            type="color"
            aria-label="主题色取色器"
            value={
              /^#[0-9a-fA-F]{6}$/.test(draft.accent)
                ? draft.accent
                : defaultSiteConfiguration.accent
            }
            disabled={busy}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                accent: event.target.value,
              }))
            }
            className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-1"
          />
          <InputField
            label="主题色"
            value={draft.accent}
            disabled={busy}
            maxLength={7}
            pattern="#[0-9a-fA-F]{6}"
            required
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                accent: event.target.value,
              }))
            }
          />
        </div>
      </Card>
      <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lg">
        <p className="text-xs text-muted">
          {dirty ? "有未保存的修改" : "所有设置已保存"}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            isDisabled={!dirty || busy}
            onPress={() => setDraft(JSON.parse(state.snapshot))}
          >
            撤销修改
          </Button>
          <Button type="submit" isPending={pending} isDisabled={!dirty || busy}>
            {pending ? (
              <Spinner size="sm" color="current" />
            ) : (
              <Save size={16} />
            )}
            保存设置
          </Button>
        </div>
      </div>
    </form>
  );
}

function ImageSetting({
  label,
  description,
  value,
  defaultValue,
  onChange,
  onUploadStart,
  onUploadEnd,
  disabled,
}: {
  label: string;
  description: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  onUploadStart: () => void;
  onUploadEnd: () => void;
  disabled: boolean;
}) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div className="grid min-w-0 content-start gap-3 rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold">{label}</h3>
      <p className="text-xs leading-6 text-muted">{description}</p>
      {value && value !== failedSource ? (
        // eslint-disable-next-line @next/next/no-img-element -- Preview admin-selected assets directly.
        <img
          src={value}
          alt={label + "预览"}
          onError={() => setFailedSource(value)}
          className="h-24 w-full rounded-lg bg-surface-secondary object-contain"
        />
      ) : (
        <div className="grid h-24 place-items-center rounded-lg bg-surface-secondary text-xs text-muted">
          {value ? "图片无法加载，请检查链接" : "未设置图片"}
        </div>
      )}
      <InputField
        label={label + "链接"}
        value={value}
        disabled={disabled}
        maxLength={2048}
        placeholder="https://…"
        onChange={(event) => {
          setError("");
          onChange(event.target.value);
        }}
      />
      <InputField
        label={label + "上传"}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={disabled}
        className="text-xs"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setError("");
          if (file.size > 2 * 1024 * 1024) {
            setError("图片不能超过 2 MB。");
            return;
          }
          setUploading(true);
          onUploadStart();
          try {
            const data = new FormData();
            data.set("file", file);
            const result = await uploadSiteAssetAction(data);
            if (result.url) onChange(result.url);
            else setError(result.error ?? "上传失败。");
          } catch {
            setError("上传失败，请稍后重试。");
          } finally {
            setUploading(false);
            onUploadEnd();
          }
        }}
      />
      {uploading ? (
        <span className="flex items-center gap-2 text-xs text-muted">
          <Spinner size="sm" />
          正在上传…
        </span>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        isDisabled={disabled || value === defaultValue}
        onPress={() => onChange(defaultValue)}
      >
        恢复默认图片
      </Button>
    </div>
  );
}
