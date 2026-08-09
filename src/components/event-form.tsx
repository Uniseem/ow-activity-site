import { ActionButton } from "@/components/action-button";
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
    <form action={action} className="grid gap-5">
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="活动标题"
          name="title"
          required
          defaultValue={event?.title ?? ""}
        />
        <label className="grid gap-2 text-sm font-semibold">
          活动类型
          <select
            className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
            name="type"
            defaultValue={event?.type ?? "FUN"}
            required
          >
            {Object.entries(eventTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="开始时间"
          name="startTime"
          type="datetime-local"
          required
          defaultValue={formatDateInputValue(event?.startTime ?? defaultStart)}
        />
        <Field
          label="报名截止"
          name="signupDeadline"
          type="datetime-local"
          defaultValue={
            event?.signupDeadline
              ? formatDateInputValue(event.signupDeadline)
              : ""
          }
        />
        <Field
          label="人数上限"
          name="maxParticipants"
          type="number"
          required
          min={2}
          max={60}
          defaultValue={String(event?.maxParticipants ?? 12)}
        />
        <label className="grid gap-2 text-sm font-semibold">
          活动状态
          <select
            className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
            name="status"
            defaultValue={event?.status ?? "DRAFT"}
            required
          >
            {Object.entries(eventStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        活动说明
        <textarea
          className="focus-ring min-h-36 resize-y rounded-md border border-black/15 px-3 py-2 text-base"
          name="description"
          required
          defaultValue={event?.description ?? ""}
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        参与要求
        <textarea
          className="focus-ring min-h-24 resize-y rounded-md border border-black/15 px-3 py-2 text-base"
          name="requirements"
          defaultValue={event?.requirements ?? ""}
        />
      </label>

      <Field
        label="语音频道说明"
        name="voiceChannel"
        defaultValue={event?.voiceChannel ?? ""}
        placeholder="例如 Discord 频道 / 开黑啦房间"
      />

      <div className="flex justify-end">
        <ActionButton className="bg-[var(--orange)] text-white hover:bg-[#dd6815]">
          {event ? "保存活动" : "创建活动"}
        </ActionButton>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  min,
  max,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {label}
      <input
        className="focus-ring min-h-11 rounded-md border border-black/15 px-3 text-base"
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}
