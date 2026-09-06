import { openaiCompatibleRoot } from "./presets";

const TIMEOUT_MS = 15_000;

export class AiClientError extends Error {}

function requestHeaders(apiKey: string, origin: string) {
  return {
    Authorization: "Bearer " + apiKey,
    "Content-Type": "application/json",
    Accept: "application/json",
    "HTTP-Referer": origin,
    "X-Title": "SJTU Overwatch",
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      body.error &&
      typeof body.error === "object" &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message
        : `模型接口返回 ${response.status}`;
    throw new AiClientError(message);
  }
  return body;
}

export async function listOpenAiModels(input: {
  baseUrl: string;
  apiKey: string;
  origin: string;
}) {
  const response = await fetch(openaiCompatibleRoot(input.baseUrl) + "/models", {
    headers: requestHeaders(input.apiKey, input.origin),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await readJson(response);
  const rows =
    body && typeof body === "object" && "data" in body && Array.isArray(body.data)
      ? body.data
      : [];
  const models = [
    ...new Set(
      rows
        .map((row) =>
          row && typeof row === "object" && "id" in row && typeof row.id === "string"
            ? row.id.trim()
            : "",
        )
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right));
  if (!models.length) throw new AiClientError("接口没有返回可用模型。");
  return models;
}

export async function createChatCompletion(input: {
  baseUrl: string;
  apiKey: string;
  origin: string;
  model: string;
  messages: { role: "system" | "user"; content: string }[];
}) {
  const response = await fetch(
    openaiCompatibleRoot(input.baseUrl) + "/chat/completions",
    {
      method: "POST",
      headers: requestHeaders(input.apiKey, input.origin),
      body: JSON.stringify({
        model: input.model,
        temperature: 0.1,
        messages: input.messages,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  const body = await readJson(response);
  const content =
    body &&
    typeof body === "object" &&
    "choices" in body &&
    Array.isArray(body.choices)
      ? body.choices[0]
      : null;
  const text =
    content &&
    typeof content === "object" &&
    "message" in content &&
    content.message &&
    typeof content.message === "object" &&
    "content" in content.message &&
    typeof content.message.content === "string"
      ? content.message.content
      : "";
  if (!text.trim()) throw new AiClientError("模型没有返回审核结果。");
  return text;
}
