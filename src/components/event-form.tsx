"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { EventFormResult } from "@/app/actions";
import { ActionButton } from "@/components/action-button";
import { EventTypeField } from "@/components/event-type-field";
import {
  InputField,
  Notice,
  SelectField,
  TextAreaField,
} from "@/components/ui";
import { DAY_MS, shanghaiDateValue, shanghaiDayBounds } from "@/lib/event-date";

type EventFormProps = {
  action: (formData: FormData) => Promise<EventFormResult>;
  feedback?: ReactNode;
  event?: {
    id: string;
    title: string;
    type: string;
    customType?: string | null;
    description: string;
    startTime: Date;
    signupDeadline?: Date | null;
    signupClosed?: boolean;
    maxParticipants: number;
    requirements?: string | null;
    voiceChannel?: string | null;
    status: string;
  };
};

export function EventForm({ action, event, feedback }: EventFormProps) {
  const router = useRouter();
  const [changed, setChanged] = useState(false);
  const [result, submit, pending] = useActionState(
    async (
      _previous: EventFormResult,
      form: FormData,
    ): Promise<EventFormResult> => {
      try {
        const saved = await action(form);
        if (saved.ok) {
          setChanged(false);
          if (saved.redirectTo) router.push(saved.redirectTo);
          else router.refresh();
        }
        return saved;
      } catch {
        return { ok: false, message: "保存失败，已保留填写内容，请重试。" };
      }
    },
    { ok: false, message: "" },
  );
  useEffect(() => {
    if (!changed && !pending) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    const leave = (event: Event) => {
      if (pending || !window.confirm("活动还有未保存的修改，确定离开吗？")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const target = new URL(anchor.href);
      if (
        !["http:", "https:"].includes(target.protocol) ||
        (target.pathname === location.pathname &&
          target.search === location.search)
      )
        return;
      leave(event);
    };
    window.addEventListener("beforeunload", prevent);
    window.addEventListener("community:before-leave", leave);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", prevent);
      window.removeEventListener("community:before-leave", leave);
      document.removeEventListener("click", navigate, true);
    };
  }, [changed, pending]);
  const defaultStart = new Date(
    shanghaiDayBounds().today.getTime() + 3 * DAY_MS,
  );
  return (
    <form
      action={submit}
      className="grid gap-6"
      onResetCapture={(event) => event.preventDefault()}
      onChangeCapture={() => setChanged(true)}
    >
      <fieldset disabled={pending} className="grid min-w-0 gap-6">
        {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
        <div className="grid items-start gap-5 md:grid-cols-2">
          <InputField
            label="活动标题"
            name="title"
            required
            minLength={2}
            maxLength={60}
            defaultValue={event?.title ?? ""}
            placeholder="给这次活动起个名字"
          />
          <EventTypeField
            defaultType={event?.type}
            defaultCustomType={event?.customType}
            onChange={() => setChanged(true)}
          />
          <InputField
            label="活动日期"
            name="eventDate"
            type="date"
            required
            defaultValue={shanghaiDateValue(event?.startTime ?? defaultStart)}
            description="按上海时间计算，活动当天进行中，次日自动结束。"
          />
          <InputField
            label="报名截止日期"
            name="signupDeadline"
            type="date"
            defaultValue={
              event?.signupDeadline
                ? shanghaiDateValue(event.signupDeadline)
                : ""
            }
            description="截止当天 23:59（上海时间），不得晚于活动日期；留空表示活动结束前均可报名。"
          />
          <InputField
            label="人数上限"
            name="maxParticipants"
            type="number"
            min={2}
            max={60}
            required
            defaultValue={String(event?.maxParticipants ?? 12)}
          />
          <SelectField
            label="发布状态"
            name="status"
            onChange={() => setChanged(true)}
            options={{
              DRAFT: "草稿",
              OPEN: "开放报名",
              CLOSED: "停止报名",
              CANCELLED: "已取消",
            }}
            defaultValue={
              event && ["RUNNING", "FINISHED"].includes(event.status)
                ? event.signupClosed
                  ? "CLOSED"
                  : "OPEN"
                : (event?.status ?? "DRAFT")
            }
            required
          />
        </div>
        <TextAreaField
          label="活动说明"
          name="description"
          required
          minLength={6}
          maxLength={1000}
          defaultValue={event?.description ?? ""}
          placeholder="介绍玩法、流程和集合方式…"
          className="min-h-36"
        />
        <details
          className="admin-disclosure border-t border-border"
          open={Boolean(event?.requirements || event?.voiceChannel)}
        >
          <summary>更多选项：参与要求与语音频道</summary>
          <div className="admin-disclosure-body grid gap-5">
            <TextAreaField
              label="参与要求"
              name="requirements"
              maxLength={500}
              defaultValue={event?.requirements ?? ""}
              placeholder="例如位置、段位或语音要求，可留空"
            />
            <InputField
              label="语音频道说明"
              name="voiceChannel"
              maxLength={200}
              defaultValue={event?.voiceChannel ?? ""}
              placeholder="例如 Discord 频道 / 开黑啦房间"
            />
          </div>
        </details>
        <div className="admin-settings-footer">
          <div className="min-w-0 flex-1" aria-live="polite">
            {result.message && (!result.ok || !changed) ? (
              <Notice tone={result.ok ? "success" : "danger"}>
                {result.message}
                {result.authRequired ? (
                  <Link
                    href="/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block underline"
                  >
                    在新标签页重新登录
                  </Link>
                ) : null}
              </Notice>
            ) : changed ? (
              <p className="text-sm text-muted">有未保存的修改</p>
            ) : (
              (feedback ?? (
                <p className="text-sm text-muted">
                  {event
                    ? "保存后更新活动信息。"
                    : "草稿仅管理员可见，开放报名后显示在前台。"}
                </p>
              ))
            )}
          </div>
          <ActionButton pendingLabel="保存中…">
            <Save size={16} />
            {event ? "保存活动" : "创建活动"}
          </ActionButton>
        </div>
      </fieldset>
    </form>
  );
}
