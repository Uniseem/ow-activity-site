import test from "node:test";
import assert from "node:assert/strict";
import { parseEventInput } from "../src/lib/event-input";

const input = {
  title: "周末内战",
  type: "SCRIM",
  customType: "",
  description: "周末一起参加社区内战。",
  eventDate: "2026-09-12",
  signupDeadline: "2026-09-11",
  maxParticipants: "12",
  requirements: "",
  voiceChannel: "",
  status: "OPEN",
};
const now = new Date("2026-09-06T02:00:00Z");

test("activity covers accept uploaded assets and external images without changing dates or status", () => {
  for (const url of [
    "https://example.org/cover.webp?version=2",
    "http://example.org/cover.png",
    "/api/site-assets/c123456789012345678901234",
  ]) {
    const result = parseEventInput({ ...input, coverUrl: ` ${url} ` }, now);
    assert.ok(result.ok);
    assert.equal(result.data.coverUrl, url);
    assert.equal(
      result.data.startTime.toISOString(),
      "2026-09-11T16:00:00.000Z",
    );
    assert.equal(
      result.data.signupDeadline?.toISOString(),
      "2026-09-11T15:59:59.999Z",
    );
    assert.equal(result.data.status, "OPEN");
  }
});

test("activity covers reject executable schemes, credentials, arbitrary local paths and oversized URLs", () => {
  for (const coverUrl of [
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "blob:https://example.org/123",
    "file:///C:/private.png",
    "//example.org/cover.png",
    "https://user:pass@example.org/cover.png",
    "/api/private",
    "https://example.org/" + "a".repeat(2048),
  ]) {
    assert.deepEqual(parseEventInput({ ...input, coverUrl }, now), {
      ok: false,
      error: "cover",
    });
  }
});

test("legacy activity inputs and explicitly cleared covers keep the empty cover default", () => {
  for (const source of [input, { ...input, coverUrl: "  " }]) {
    const result = parseEventInput(source, now);
    assert.ok(result.ok);
    assert.equal(result.data.coverUrl, "");
  }
});
