/**
 * Contenu du QR de la convocation.
 * Lu par un lecteur QR ordinaire, il affiche l'identité du candidat en clair ;
 * la dernière ligne (MIA1.…) est le jeton signé Ed25519 que vérifie l'application
 * de scan : un QR modifié ou recopié à la main est détecté.
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
  qrToken: string;
};

/** Année scolaire d'une session : Bac 2027 → 2026-2027. */
export const schoolYear = (year: number) => `${year - 1}-${year}`;

export function qrText(c: QrCandidate) {
  return [
    `MIANARA - Convocation Bac ${c.sessionYear}`,
    `Nom : ${c.lastName}`,
    `Prénom : ${c.firstName}`,
    `Adresse : ${c.address || "-"}`,
    `École : ${c.kind === "libre" ? "Candidat libre" : c.schoolName || "-"}`,
    `Session : ${schoolYear(c.sessionYear)}`,
    `Série : ${c.serieCode} (${c.serieName})`,
    `Matricule : ${c.matricule}`,
    c.qrToken,
  ].join("\n");
}

/** Extrait le jeton signé d'un QR lu (texte complet) ou d'un jeton seul. */
export function extractToken(scanned: string) {
  return scanned.match(/MIA1\.[A-Za-z0-9_-]+/)?.[0] ?? null;
}
