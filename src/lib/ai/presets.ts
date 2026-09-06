// Channel list follows one-api / New API / LiteLLM: one OpenAI-compatible
// base URL plus a key, then pick any model that gateway exposes.
export const AI_PRESETS = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
  },
  {
    id: "siliconflow",
    label: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
  },
  {
    id: "dashscope",
    label: "通义千问（兼容模式）",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    id: "moonshot",
    label: "Kimi / Moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
  },
  {
    id: "zhipu",
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
  },
  {
    id: "oneapi",
    label: "One API / New API / LiteLLM",
    baseUrl: "",
  },
  {
    id: "custom",
    label: "自定义 OpenAI 兼容接口",
    baseUrl: "",
  },
] as const;

export type AiPresetId = (typeof AI_PRESETS)[number]["id"];

export const aiPresetLabels = Object.fromEntries(
  AI_PRESETS.map((preset) => [preset.id, preset.label]),
) as Record<AiPresetId, string>;

export function isAiPresetId(value: string): value is AiPresetId {
  return AI_PRESETS.some((preset) => preset.id === value);
}

export function presetBaseUrl(id: string) {
  return AI_PRESETS.find((preset) => preset.id === id)?.baseUrl ?? "";
}

export function parseAiBaseUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("接口地址不正确。");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new Error("接口地址只支持 HTTP 或 HTTPS。");
  if (url.username || url.password)
    throw new Error("接口地址不能包含用户名或密码。");
  if (url.hash) throw new Error("接口地址不能包含片段。");
  return url.href.replace(/\/+$/, "");
}

export function openaiCompatibleRoot(baseUrl: string) {
  const trimmed = parseAiBaseUrl(baseUrl);
  return /\/v\d+$/i.test(trimmed) ? trimmed : trimmed + "/v1";
}
