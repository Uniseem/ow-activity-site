import { Save } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { EventTypeField } from "@/components/event-type-field";
import { InputField, SelectField, TextAreaField } from "@/components/ui";
import { DAY_MS, shanghaiDateValue, shanghaiDayBounds } from "@/lib/event-date";

type EventFormProps = {
  action: (formData: FormData) => Promise<void>;
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

export function EventForm({ action, event }: EventFormProps) {
  const defaultStart = new Date(
    shanghaiDayBounds().today.getTime() + 3 * DAY_MS,
  );
  return (
    <form action={action} className="grid gap-6">
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
            event?.signupDeadline ? shanghaiDateValue(event.signupDeadline) : ""
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
      <div className="flex justify-end border-t border-separator pt-5">
        <ActionButton pendingLabel="保存中…">
          <Save size={16} />
          {event ? "保存活动" : "创建活动"}
        </ActionButton>
      </div>
    </form>
  );
}
