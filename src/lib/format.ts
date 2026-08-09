export const roleLabels = {
  TANK: "坦克",
  DAMAGE: "输出",
  SUPPORT: "支援",
  FLEX: "全能",
} as const;

export const eventTypeLabels = {
  SCRIM: "内战",
  FUN: "娱乐赛",
  TRAINING: "训练赛",
  CUSTOM: "自定义",
  COMPETITIVE: "竞技组队",
  WATCH: "观赛",
  OTHER: "其他",
} as const;

export const eventStatusLabels = {
  DRAFT: "草稿",
  OPEN: "报名中",
  CLOSED: "已截止",
  RUNNING: "进行中",
  FINISHED: "已结束",
  CANCELLED: "已取消",
} as const;

export const reviewLabels = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
} as const;

export const userStatusLabels = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
  BANNED: "已封禁",
} as const;

export const registrationStatusLabels = {
  PENDING: "待审核",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
  CANCELLED: "已取消",
} as const;

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).format(date);
}

export function formatDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "OW";
}
