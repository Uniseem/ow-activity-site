export type AiReviewDecision = "APPROVED" | "REJECTED" | "PENDING";

export type AiReviewInput = {
  displayName: string;
  slogan: string;
  battleTag?: string | null;
  mainRole?: string | null;
  mainHeroes?: string[];
  rank?: string | null;
  onlineTime?: string | null;
  contact?: string | null;
  extraNote?: string | null;
  hasAvatar?: boolean;
};

const REVIEW_SCHEMA = {
  decision: "APPROVED | REJECTED | PENDING",
  note: "给玩家看的中文说明，不超过 80 字",
} as const;

export function buildReviewPrompt(_profile: AiReviewInput) {
  return [
    "你是上海交大非官方守望先锋社区的资料审核员。",
    "只根据资料本身判断，不要编造没写的信息。",
    "通过：昵称正常，没有广告、辱骂、色情、政治煽动或明显假资料。资料可以不完整。",
    "拒绝：垃圾昵称、广告引流、辱骂、色情、冒充他人，或明显不是来参加活动的。",
    "拿不准就 PENDING，交给人工。",
    "只输出一个 JSON 对象，不要 Markdown：",
    JSON.stringify(REVIEW_SCHEMA),
  ].join("");
}

export function buildReviewUserMessage(profile: AiReviewInput) {
  return JSON.stringify({
    displayName: profile.displayName,
    slogan: profile.slogan,
    battleTag: profile.battleTag || "",
    mainRole: profile.mainRole || "",
    mainHeroes: profile.mainHeroes ?? [],
    rank: profile.rank || "",
    onlineTime: profile.onlineTime || "",
    contact: profile.contact || "",
    extraNote: profile.extraNote || "",
    hasAvatar: Boolean(profile.hasAvatar),
  });
}

export function parseReviewResponse(text: string): {
  decision: AiReviewDecision;
  note: string;
} {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { decision: "PENDING", note: "" };
  try {
    const parsed = JSON.parse(match[0]) as {
      decision?: string;
      note?: string;
    };
    const decision =
      parsed.decision === "APPROVED" || parsed.decision === "REJECTED"
        ? parsed.decision
        : "PENDING";
    const note = String(parsed.note ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    return { decision, note };
  } catch {
    return { decision: "PENDING", note: "" };
  }
}
