import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkScan,
  computeResult,
  formatMatricule,
  parseLocalDateTime,
  scanState,
  toLocalInput,
} from "./bac-rules";

const subjects = [
  { subjectId: 1, coefficient: 5 },
  { subjectId: 2, coefficient: 5 },
  { subjectId: 3, coefficient: 20 },
];
const result = (scores: [number, number][], opts: Partial<Parameters<typeof computeResult>[0]> = {}) =>
  computeResult({
    subjects,
    scores: new Map(scores),
    hasFraud: false,
    wasPresent: true,
    threshold: 10,
    ...opts,
  });

test("moyenne pondérée, admission et mentions (RG-10)", () => {
  assert.equal(
    result([
      [1, 12],
      [2, 14],
      [3, 10],
    ]).average,
    11,
  );
  assert.equal(
    result([
      [1, 12],
      [2, 14],
      [3, 10],
    ]).decision,
    "admitted",
  );
  assert.equal(
    result([
      [1, 18],
      [2, 18],
      [3, 16],
    ]).mention,
    "tres_bien",
  );
});

test("un 0 ou une note manquante est éliminatoire", () => {
  assert.equal(
    result([
      [1, 0],
      [2, 20],
      [3, 20],
    ]).decision,
    "failed",
  );
  assert.equal(
    result([
      [1, 12],
      [2, 14],
    ]).decision,
    "failed",
  );
});

test("seuil du jury abaissé à 9,50", () => {
  const r = result(
    [
      [1, 9.6],
      [2, 9.6],
      [3, 9.6],
    ],
    { threshold: 9.5 },
  );
  assert.equal(r.decision, "admitted");
  assert.equal(r.mention, "passable");
});

test("absent et fraude", () => {
  assert.equal(result([], { wasPresent: false }).decision, "absent");
  assert.equal(
    result(
      [
        [1, 20],
        [2, 20],
        [3, 20],
      ],
      { hasFraud: true },
    ).decision,
    "fraud",
  );
});

test("matricule et fuseau de Madagascar", () => {
  assert.equal(formatMatricule(2027, "S", 42), "BAC2027-S-00042");
  const d = parseLocalDateTime("2027-08-16T07:00")!;
  assert.equal(d.toISOString(), "2027-08-16T04:00:00.000Z");
  assert.equal(toLocalInput(d), "2027-08-16T07:00");
});

test("fenêtres de scan (RG-05, RG-06, RG-07)", () => {
  const start = parseLocalDateTime("2027-08-16T07:00")!;
  const exam = { startsAt: start, endsAt: new Date(start.getTime() + 3 * 3600e3) };
  const at = (min: number) => new Date(start.getTime() + min * 60e3);
  const none = scanState([]);
  assert.match(checkScan("entry", none, exam, at(-45))!, /30 minutes/);
  assert.equal(checkScan("entry", none, exam, at(-10)), null);
  assert.equal(checkScan("entry", none, exam, at(0)), null);
  assert.match(checkScan("entry", none, exam, at(1))!, /retard/);
  assert.match(checkScan("end", none, exam, at(60))!, /absent/);
  assert.match(checkScan("entry", scanState(["entry"]), exam, at(-5))!, /déjà/);
  assert.equal(checkScan("exit", scanState(["entry"]), exam, at(30)), null);
  assert.match(checkScan("end", scanState(["entry", "exit"]), exam, at(40))!, /retour/);
  assert.equal(checkScan("end", scanState(["entry", "exit", "return"]), exam, at(200)), null);
  assert.match(checkScan("end", scanState(["entry"]), exam, at(211))!, /fermé/);
});
