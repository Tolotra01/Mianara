import assert from "node:assert/strict";
import { test } from "node:test";
import { coachingMessageInput, coachingPaymentInput, presentCoachingMessage, presentLearningItem } from "./learning-contract";

const item = {
  id: "listing-id",
  kind: "coaching" as const,
  subjectCode: "MATH",
  title: "Coaching de mathématiques",
  description: "Accompagnement sur les exercices.",
  content: "Contenu intégral confidentiel de la séance.",
  priceAmount: 25_000,
  durationMinutes: 60,
};

test("unpaid priced learning content is redacted to its description", () => {
  const result = presentLearningItem(item, false);
  assert.equal(result.content, item.description);
  assert.equal(result.purchased, false);
  assert.equal(result.currency, "MGA");
  assert.deepEqual(Object.keys(result), [
    "id", "kind", "subjectCode", "title", "description", "content",
    "priceAmount", "currency", "durationMinutes", "purchased",
  ]);
});

test("approved purchases and free listings receive full content", () => {
  assert.equal(presentLearningItem(item, true).content, item.content);
  assert.equal(presentLearningItem({ ...item, priceAmount: null }, false).purchased, true);
});

test("coaching payment input cannot assert amount, series, candidate, or teacher", () => {
  const input = { listingId: "ce6bf13a-8796-433f-90a0-c90394d56515", transactionReference: "OM-2026-12345" };
  assert.equal(coachingPaymentInput.safeParse(input).success, true);
  assert.equal(coachingPaymentInput.safeParse({ ...input, amount: 1 }).success, false);
  assert.equal(coachingPaymentInput.safeParse({ ...input, candidateId: "forged" }).success, false);
});

test("chat input and output expose message fields but no participant identifiers", () => {
  assert.equal(coachingMessageInput.safeParse({ text: "Bonjour" }).success, true);
  assert.equal(coachingMessageInput.safeParse({ text: "Bonjour", senderId: "forged" }).success, false);
  assert.equal(coachingMessageInput.safeParse({ text: " ".repeat(4001) }).success, false);
  assert.deepEqual(presentCoachingMessage({
    id: "message-id", sender: "teacher", text: "Bonjour", createdAt: "2026-09-26T12:00:00.000Z",
    senderId: "must-not-appear", candidateName: "must-not-appear",
  } as Parameters<typeof presentCoachingMessage>[0] & { senderId: string; candidateName: string }), {
    id: "message-id", sender: "teacher", text: "Bonjour", createdAt: "2026-09-26T12:00:00.000Z",
  });
});
