import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractMatricule, extractToken, qrText, schoolYear, type QrCandidate } from "./qr-content";

const CANDIDAT: QrCandidate = {
  lastName: "ANDRIAMAMPIANINA",
  firstName: "Toky",
  address: "Lot 3 Ankadifotsy, Antananarivo",
  schoolName: "Lycée Jean-Joseph Rabearivelo",
  kind: "ecole",
  serieCode: "L",
  serieName: "Littéraire",
  sessionYear: 2027,
  matricule: "BAC2027-L-00018",
};

const JETON =
  "MIA1.AYOj8t_300Gii35Ei5URV2dJ8dBPfWLJHfmWUQYfSTGzZ2NPwgjDIMBCl_zs3lFHovV_b3p41el2Mdi5GVQ0d251fLYZdkz80D-ZJ2EZvy0N";

test("le QR affiche l'identité en clair, dans l'ordre attendu", () => {
  assert.equal(
    qrText(CANDIDAT),
    [
      "MIANARA - Convocation",
      "Nom : ANDRIAMAMPIANINA",
      "Prénom : Toky",
      "Adresse : Lot 3 Ankadifotsy, Antananarivo",
      "École : Lycée Jean-Joseph Rabearivelo",
      "Session : 2026-2027",
      "Série : L (Littéraire)",
      "Matricule : BAC2027-L-00018",
    ].join("\n"),
  );
});

test("le QR ne contient plus de jeton signé", () => {
  const texte = qrText(CANDIDAT);
  assert.ok(!texte.includes("MIA1."), "aucun jeton signé dans le QR");
  assert.ok(!/MIA1\./.test(texte), "aucun identifiant technique exposé");
  assert.equal(extractToken(texte), null, "rien à copier ni à rejouer");
});

test("le candidat libre est identifié comme tel", () => {
  const texte = qrText({ ...CANDIDAT, kind: "libre", schoolName: null, address: null });
  assert.ok(texte.includes("École : Candidat libre"), "pas de vide à la place de l'école");
  assert.ok(texte.includes("Adresse : -"), "pas de ligne cassée si l'adresse manque");
});

test("le matricule est retrouvé dans le texte scanné", () => {
  assert.equal(extractMatricule(qrText(CANDIDAT)), "BAC2027-L-00018");
  // Insensible à la casse et aux espaces autour des deux-points.
  assert.equal(extractMatricule("matricule :  bac2027-l-00018"), "BAC2027-L-00018");
  // Matricule saisi seul, au clavier.
  assert.equal(extractMatricule("bac2027-l-00018"), "BAC2027-L-00018");
  assert.equal(extractMatricule("rien ici"), null);
  assert.equal(extractMatricule(""), null);
});

test("les convocations de l'ancien format restent reconnues", () => {
  const ancien = qrText(CANDIDAT) + "\n" + JETON;
  assert.equal(extractToken(ancien), JETON, "le jeton signé reste extrait");
  assert.equal(extractMatricule(ancien), "BAC2027-L-00018", "le matricule reste extrait");
});

test("l'année scolaire suit l'année de la session", () => {
  assert.equal(schoolYear(2027), "2026-2027");
  assert.equal(schoolYear(2026), "2025-2026");
});
