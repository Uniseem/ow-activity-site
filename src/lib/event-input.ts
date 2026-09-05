import { z } from "zod";
import { parseShanghaiDate, scheduledEventStatus } from "@/lib/event-date";

export const eventInputSchema = z
  .object({
    title: z.string().trim().min(2).max(60),
    type: z.enum(["SCRIM", "FUN", "TRAINING", "WATCH", "CUSTOM"]),
    customType: z.string().trim().max(30),
    description: z.string().trim().min(6).max(1000),
    eventDate: z.string(),
    signupDeadline: z.string(),
    maxParticipants: z.coerce.number().int().min(2).max(60),
    requirements: z.string().trim().max(500),
    voiceChannel: z.string().trim().max(200),
    status: z.enum(["DRAFT", "OPEN", "CLOSED", "CANCELLED"]),
  })
  .refine((data) => data.type !== "CUSTOM" || data.customType.length > 0, {
    path: ["customType"],
    message: "请填写自定义活动类型。",
  });

export function parseEventInput(input: unknown, now = new Date()) {
  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" } as const;
  const {
    eventDate,
    signupDeadline: deadline,
    customType,
    ...data
  } = parsed.data;
  const startTime = parseShanghaiDate(eventDate);
  const signupDeadline = deadline ? parseShanghaiDate(deadline, true) : null;
  if (
    !startTime ||
    (deadline && !signupDeadline) ||
    (deadline && deadline > eventDate)
  ) {
    return { ok: false, error: "date" } as const;
  }
  return {
    ok: true,
    data: {
      ...data,
      startTime,
      signupDeadline,
      signupClosed: data.status === "CLOSED",
      customType: data.type === "CUSTOM" ? customType : null,
      requirements: data.requirements || null,
      voiceChannel: data.voiceChannel || null,
      status: scheduledEventStatus({ ...data, startTime, signupDeadline }, now),
    },
  } as const;
}
