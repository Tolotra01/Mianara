import assert from "node:assert/strict";
import { test } from "node:test";
import { isCandidateAccessClosed } from "./candidate-access";

const now = new Date("2026-09-26T12:00:00.000Z");
const active = {
  status: "active",
  reactivatedAt: null,
  publishAt: null,
  days: 60,
};

test("candidate access honors disabled and RG-15 result closure", () => {
  assert.equal(isCandidateAccessClosed({ ...active, status: "disabled" }, now), true);
  assert.equal(
    isCandidateAccessClosed(
      { ...active, status: "failed", publishAt: new Date("2026-07-01T12:00:00.000Z") },
      now,
    ),
    true,
  );
  assert.equal(
    isCandidateAccessClosed(
      { ...active, status: "failed", publishAt: new Date("2026-08-01T12:00:00.000Z") },
      now,
    ),
    false,
  );
});

test("manual candidate reactivation overrides time-based closure", () => {
  assert.equal(
    isCandidateAccessClosed(
      {
        ...active,
        status: "fraud",
        publishAt: new Date("2026-07-01T12:00:00.000Z"),
        reactivatedAt: new Date("2026-09-01T12:00:00.000Z"),
      },
      now,
    ),
    false,
  );
});
