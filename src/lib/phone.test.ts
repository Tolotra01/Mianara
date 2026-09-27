import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidPhone, normalizePhone, phoneField } from "./phone";

const parse = (value: unknown) => phoneField().safeParse(value);

test("numéro malgache : les six indicatifs ouverts sont acceptés", () => {
  for (const prefix of ["032", "037", "033", "034", "038", "036"]) {
    const number = `${prefix}1234567`;
    assert.equal(isValidPhone(number), true, `${number} devrait être accepté`);
    const parsed = parse(number);
    assert.equal(parsed.success, true, `${number} devrait passer la validation`);
  }
});

test("numéro malgache : indicatif inconnu refusé", () => {
  for (const number of ["0202200001", "0311234567", "0391234567", "0021234567"]) {
    assert.equal(isValidPhone(number), false, `${number} devrait être refusé`);
    assert.equal(parse(number).success, false, `${number} ne devrait pas passer la validation`);
  }
});

test("numéro malgache : dix chiffres exactement", () => {
  assert.equal(parse("032123456").success, false, "9 chiffres refusés");
  assert.equal(parse("03212345678").success, false, "11 chiffres refusés");
  assert.equal(parse("0321234567a").success, false, "lettre refusée");
});

test("numéro malgache : séparateurs de saisie retirés", () => {
  assert.equal(normalizePhone("032 12 345 67"), "0321234567");
  assert.equal(normalizePhone("032-12.345(67)"), "0321234567");
  const parsed = parse(" 032 12 345 67 ");
  assert.equal(parsed.success, true);
  assert.equal(parsed.success && parsed.data, "0321234567", "le numéro est stocké sans séparateur");
});

test("numéro malgache : champ facultatif", () => {
  const vide = parse("");
  assert.equal(vide.success, true);
  assert.equal(vide.success && vide.data, null, "un champ vide est enregistré comme null");

  const absent = parse(undefined);
  assert.equal(absent.success, true);
  assert.equal(absent.success && absent.data, null, "un champ absent est enregistré comme null");
});

test("numéro malgache : le message d'erreur liste les indicatifs", () => {
  const parsed = parse("0202200001");
  assert.equal(parsed.success, false);
  const message = !parsed.success ? parsed.error.issues[0].message : "";
  assert.match(message, /032, 037, 033, 034, 038, 036/);
});
