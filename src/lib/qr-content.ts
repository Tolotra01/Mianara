/**
 * Contenu du QR de la convocation : l'identité du candidat en clair, lisible
 * par n'importe quel lecteur. Le scan retrouve le candidat par son matricule ;
 * le surveillant compare alors la photo affichée au visage du candidat.
 *
 * Les convocations imprimées avant ce changement portent encore, en dernière
 * ligne, un jeton signé (MIA1.…) : il reste accepté et vérifié.
 */
export type QrCandidate = {
  lastName: string;
  firstName: string;
  address: string | null;
  schoolName: string | null;
  kind: string;
  serieCode: string;
  serieName: string;
  sessionYear: number;
  matricule: string;
};

/** Année scolaire d'une session : Bacc 2027 → 2026-2027. */
export const schoolYear = (year: number) => `${year - 1}-${year}`;

export function qrText(c: QrCandidate) {
  return [
    `MIANARA - Convocation Bacc ${c.sessionYear}`,
    `Nom : ${c.lastName}`,
    `Prénom : ${c.firstName}`,
    `Adresse : ${c.address || "-"}`,
    `École : ${c.kind === "libre" ? "Candidat libre" : c.schoolName || "-"}`,
    `Session : ${schoolYear(c.sessionYear)}`,
    `Série : ${c.serieCode} (${c.serieName})`,
    `Matricule : ${c.matricule}`,
  ].join("\n");
}

/** Matricule lu dans un QR (ligne « Matricule : … ») ou saisi seul (BAC2027-S-00001). */
export function extractMatricule(scanned: string) {
  const line = scanned.match(/Matricule\s*:\s*(\S+)/i)?.[1];
  const raw = (line ?? scanned).trim().toUpperCase();
  return /^BAC\d{4}-[A-Z]{1,4}-\d{5}$/.test(raw) ? raw : null;
}

/** Extrait le jeton signé d'un ancien QR (texte complet) ou d'un jeton seul. */
export function extractToken(scanned: string) {
  return scanned.match(/MIA1\.[A-Za-z0-9_-]+/)?.[0] ?? null;
}
