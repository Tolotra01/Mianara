import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mobileRevisionBatchSchema,
  MOBILE_CHANGE_PASSWORD_BODY,
  MOBILE_LOGIN_BODY,
} from "./mobile-contract";

const now = new Date("2026-09-26T12:00:00.000Z");
const revision = {
  id: "2d257c3d-0847-4bb9-9da2-f478c55316f0",
  subject: "MATH",
  startedAt: "2026-09-26T11:00:00.000Z",
  endedAt: "2026-09-26T11:45:00.000Z",
  progress: 75,
};

test("mobile login contract accepts only bounded credentials", () => {
  assert.equal(
    MOBILE_LOGIN_BODY.safeParse({ identifiant: " BAC2027-S-00042 ", password: "secret" }).success,
    true,
  );
  assert.equal(
    MOBILE_LOGIN_BODY.safeParse({ identifiant: "candidate", password: "secret", role: "candidate" }).success,
    false,
  );
  assert.equal(MOBILE_LOGIN_BODY.safeParse({ identifiant: "", password: "secret" }).success, false);
});

test("mobile password change enforces the web password policy", () => {
  assert.equal(
    MOBILE_CHANGE_PASSWORD_BODY.safeParse({
      currentPassword: "temporary1",
      newPassword: "NewPassword2",
    }).success,
    true,
  );
  assert.equal(
    MOBILE_CHANGE_PASSWORD_BODY.safeParse({
      currentPassword: "temporary1",
      newPassword: "short",
    }).success,
    false,
  );
  assert.equal(
    MOBILE_CHANGE_PASSWORD_BODY.safeParse({
      currentPassword: "same-pass1",
      newPassword: "same-pass1",
    }).success,
    false,
  );
  assert.equal(
    MOBILE_CHANGE_PASSWORD_BODY.safeParse({
      currentPassword: "temporary1",
      newPassword: "NewPassword2",
      userId: "forged",
    }).success,
    false,
  );
});

test("mobile sync validates a bounded revision batch and rejects official fields", () => {
  const schema = mobileRevisionBatchSchema(now);
  assert.equal(schema.safeParse({ revisions: [] }).success, true);
  assert.equal(schema.safeParse({ revisions: [revision] }).success, true);
  assert.equal(
    schema.safeParse({ revisions: [{ ...revision, candidateId: "forged" }] }).success,
    false,
  );
  assert.equal(
    schema.safeParse({ revisions: [{ ...revision, endedAt: "2026-09-26T10:00:00.000Z" }] }).success,
    false,
  );
  assert.equal(schema.safeParse({ revisions: Array(101).fill(revision) }).success, false);
});

test("sync enforces stable unique client IDs within a batch for idempotency", () => {
  const schema = mobileRevisionBatchSchema(now);
  assert.equal(schema.safeParse({ revisions: [revision, revision] }).success, false);
  assert.equal(
    schema.safeParse({ revisions: [{ ...revision, startedAt: "2030-01-01T00:00:00.000Z" }] }).success,
    false,
  );
});
