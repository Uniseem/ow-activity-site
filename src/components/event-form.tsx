import { Save } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { InputField, SelectField, TextAreaField } from "@/components/ui";
import {
  eventStatusLabels,
  eventTypeLabels,
  formatDateInputValue,
} from "@/lib/format";

type EventFormProps = {
  action: (formData: FormData) => Promise<void>;
  event?: {
    id: string;
    title: string;
    type: string;
    description: string;
    startTime: Date;
    signupDeadline?: Date | null;
    maxParticipants: number;
    requirements?: string | null;
    voiceChannel?: string | null;
    status: string;
  };
};

export function EventForm({ action, event }: EventFormProps) {
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() + 3);
  defaultStart.setHours(20, 30, 0, 0);
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
        <SelectField
          label="活动类型"
          name="type"
          options={eventTypeLabels}
          defaultValue={event?.type ?? "FUN"}
          required
        />
        <InputField
          label="开始时间"
          name="startTime"
          type="datetime-local"
          required
          defaultValue={formatDateInputValue(event?.startTime ?? defaultStart)}
        />
        <InputField
          label="报名截止"
          name="signupDeadline"
          type="datetime-local"
          defaultValue={
            event?.signupDeadline
              ? formatDateInputValue(event.signupDeadline)
              : ""
          }
          description="留空则不设置报名截止时间。"
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
          label="活动状态"
          name="status"
          options={eventStatusLabels}
          defaultValue={event?.status ?? "DRAFT"}
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
