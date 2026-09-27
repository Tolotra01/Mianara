import assert from "node:assert/strict";
import test from "node:test";
import { extractMatricule, extractToken, qrText } from "./qr-content";

const candidate = {
  lastName: "RAKOTO",
  firstName: "Hery",
  address: "Lot II A 12, Antananarivo",
  schoolName: "Lycée Andohalo",
  kind: "ecole",
  serieCode: "S",
  serieName: "Scientifique",
  sessionYear: 2027,
  matricule: "BAC2027-S-00042",
};

test("QR text shows the identity but no signed token", () => {
  const text = qrText(candidate);
  assert.match(text, /Matricule : BAC2027-S-00042/);
  assert.equal(extractToken(text), null);
  assert.doesNotMatch(text, /MIA1\./);
});

test("matricule is read from a scanned QR or typed alone", () => {
  assert.equal(extractMatricule(qrText(candidate)), "BAC2027-S-00042");
  assert.equal(extractMatricule("  bac2027-tgc-00007 "), "BAC2027-TGC-00007");
  assert.equal(extractMatricule("Matricule : BAC2027-OSE-12345\nMIA1.abc"), "BAC2027-OSE-12345");
});

test("unreadable content yields no matricule", () => {
  assert.equal(extractMatricule("bonjour"), null);
  assert.equal(extractMatricule("Matricule : 12345"), null);
});

test("an old signed QR still exposes its token", () => {
  assert.equal(extractToken("Nom : RAKOTO\nMIA1.AbC-_09"), "MIA1.AbC-_09");
});
