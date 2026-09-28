import test from "node:test";
import assert from "node:assert/strict";
import {
  parseShanghaiDate,
  scheduledEventStatus,
  shanghaiDateValue,
  shanghaiDayBounds,
} from "../src/lib/event-date";
import { parseEventInput } from "../src/lib/event-input";

test("Shanghai dates use explicit UTC+8 boundaries, including leap days", () => {
  assert.equal(
    parseShanghaiDate("2026-09-05")?.toISOString(),
    "2026-09-04T16:00:00.000Z",
  );
  assert.equal(
    parseShanghaiDate("2026-09-05", true)?.toISOString(),
    "2026-09-05T15:59:59.999Z",
  );
  assert.equal(
    shanghaiDateValue(new Date("2026-12-31T16:00:00Z")),
    "2027-01-01",
  );
  assert.equal(
    shanghaiDayBounds(new Date("2026-12-31T16:00:00Z")).tomorrow.toISOString(),
    "2027-01-01T16:00:00.000Z",
  );
  assert.ok(parseShanghaiDate("2028-02-29"));
  for (const value of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-09-05T20:30",
    "invalid",
  ])
    assert.equal(parseShanghaiDate(value), null);
});

test("published events become running at Shanghai midnight and finish the following midnight", () => {
  const event = {
    startTime: parseShanghaiDate("2026-09-05")!,
    status: "OPEN" as const,
  };
  assert.equal(
    scheduledEventStatus(event, new Date("2026-09-04T15:59:59.999Z")),
    "OPEN",
  );
  assert.equal(
    scheduledEventStatus(event, new Date("2026-09-04T16:00:00Z")),
    "RUNNING",
  );
  assert.equal(
    scheduledEventStatus(event, new Date("2026-09-05T15:59:59.999Z")),
    "RUNNING",
  );
  assert.equal(
    scheduledEventStatus(event, new Date("2026-09-05T16:00:00Z")),
    "FINISHED",
  );
  for (const status of ["DRAFT", "CANCELLED"] as const)
    assert.equal(
      scheduledEventStatus(
        { ...event, status },
        new Date("2026-09-07T00:00:00Z"),
      ),
      status,
    );
});

test("registration deadline includes the entire selected date", () => {
  const event = {
    startTime: parseShanghaiDate("2026-09-07")!,
    signupDeadline: parseShanghaiDate("2026-09-05", true),
    status: "OPEN" as const,
  };
  assert.equal(
    scheduledEventStatus(event, new Date("2026-09-05T15:59:59.999Z")),
    "OPEN",
  );
  assert.equal(
    scheduledEventStatus(event, new Date("2026-09-05T16:00:00Z")),
    "CLOSED",
  );
});

const input = {
  title: "周末活动",
  type: "CUSTOM",
  customType: " 英雄挑战 ",
  description: "一起参与英雄挑战活动。",
  eventDate: "2026-09-05",
  signupDeadline: "2026-09-05",
  maxParticipants: "12",
  requirements: "",
  voiceChannel: "",
  status: "OPEN",
};

test("event form validates dates and custom type, and normalizes persisted values", () => {
  const result = parseEventInput(input, new Date("2026-09-05T02:00:00Z"));
  assert.ok(result.ok);
  assert.equal(result.data.customType, "英雄挑战");
  assert.equal(result.data.status, "RUNNING");
  assert.equal(
    result.data.signupDeadline?.toISOString(),
    "2026-09-05T15:59:59.999Z",
  );
  assert.equal(result.data.signupClosed, false);
  assert.deepEqual(parseEventInput({ ...input, customType: " " }), {
    ok: false,
    error: "invalid",
  });
  assert.deepEqual(parseEventInput({ ...input, type: "COMPETITIVE" }), {
    ok: false,
    error: "invalid",
  });
  assert.deepEqual(
    parseEventInput({ ...input, signupDeadline: "2026-09-06" }),
    { ok: false, error: "date" },
  );
  assert.deepEqual(parseEventInput({ ...input, signupDeadline: "garbage" }), {
    ok: false,
    error: "date",
  });
  const standard = parseEventInput(
    { ...input, type: "WATCH", status: "CLOSED" },
    new Date("2026-09-05T02:00:00Z"),
  );
  assert.ok(standard.ok);
  assert.equal(standard.data.customType, null);
  assert.equal(standard.data.signupClosed, true);
  assert.equal(standard.data.status, "RUNNING");
});
