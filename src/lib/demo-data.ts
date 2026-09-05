import { DAY_MS, parseShanghaiDate, shanghaiDateValue } from "@/lib/event-date";
const today = parseShanghaiDate(shanghaiDateValue())!;
const weekday = new Date(today.getTime() + 8 * 3_600_000).getUTCDay();
const nextSaturday = new Date(
  today.getTime() + ((6 - weekday + 7) % 7 || 7) * DAY_MS,
);
const nextFriday = new Date(nextSaturday.getTime() - 1);

export const demoEvents = [
  {
    id: "demo-weekend-scrim",
    title: "周末内战",
    description: "轻松组队，按报名位置做基础平衡，优先照顾能全程语音的玩家。",
    type: "SCRIM",
    customType: null,
    signupClosed: false,
    status: "OPEN",
    startTime: nextSaturday,
    signupDeadline: nextFriday,
    maxParticipants: 12,
    requirements: "资料审核通过后可报名。",
    voiceChannel: "活动开始前由管理员通知。",
    registrations: [{ id: "r1" }, { id: "r2" }, { id: "r3" }],
  },
  {
    id: "demo-custom-night",
    title: "自定义娱乐房",
    description: "快速模式规则混合英雄限制，适合新朋友一起熟悉队伍节奏。",
    type: "CUSTOM",
    customType: "英雄挑战",
    signupClosed: false,
    status: "OPEN",
    startTime: new Date(nextSaturday.getTime() + 1000 * 60 * 60 * 24 * 3),
    signupDeadline: new Date(nextSaturday.getTime() + DAY_MS * 3 - 1),
    maxParticipants: 10,
    requirements: "能语音优先，不强制段位。",
    voiceChannel: "Discord / 开黑啦均可。",
    registrations: [{ id: "r4" }],
  },
] as const;

export const demoProfiles = [
  {
    id: "demo-player-1",
    avatarUrl: "",
    displayName: "晨星",
    slogan: "先保队友，再找机会。",
    mainRole: "SUPPORT",
    mainHeroes: ["安娜", "巴蒂斯特"],
  },
  {
    id: "demo-player-2",
    avatarUrl: "",
    displayName: "回声轨道",
    slogan: "愿意补位，也愿意指挥。",
    mainRole: "FLEX",
    mainHeroes: ["D.Va", "黑影", "禅雅塔"],
  },
  {
    id: "demo-player-3",
    avatarUrl: "",
    displayName: "南极靶场",
    slogan: "今晚少白给一波。",
    mainRole: "DAMAGE",
    mainHeroes: ["士兵：76", "艾什"],
  },
] as const;
