/**
 * Contenu du QR de la convocation.
 *
 * Le QR est un document lisible : n'importe quel lecteur — l'application de
 * scan, mais aussi l'appareil photo d'un téléphone — affiche l'identité du
 * candidat. C'est volontairement le but : au contrôle d'entrée, le surveillant
 * voit immédiatement de qui il s'agit, sans application particulière.
 *
 * Il ne contient volontairement **aucun jeton signé** : rien à copier ni à
 * rejouer, et aucun identifiant technique exposé à la lecture. Le matricule
 * fait foi ; `findCandidate()` le retrouve dans le texte scanné.
 *
 * Conséquence assumée : le matricule n'étant plus signé, il peut être recopié
 * ou saisi à la main. La signature Ed25519 (`signQr`/`verifyQr`, RG-04) reste
 * en place, et `extractToken()` continue de reconnaître les convocations
 * imprimées avant ce changement.
 */

/** Préfixe historique : les anciennes convocations portaient ce schéma. */
export const QR_SCHEME = "mianara://candidat/";

/** Année scolaire d'une session : Bacc 2027 → 2026-2027. */
export const schoolYear = (year: number) => `${year - 1}-${year}`;

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

/**
 * Texte encodé dans le QR : l'identité en clair, lisible par tout lecteur.
 *
 * L'ordre est fixe : `findCandidate()` retrouve le matricule par son étiquette
 * « Matricule : », quel que soit le lecteur utilisé.
 */
export function qrText(c: QrCandidate): string {
  return [
    "MIANARA - Convocation",
    `Nom : ${c.lastName}`,
    `Prénom : ${c.firstName}`,
    `Adresse : ${c.address || "-"}`,
    `École : ${c.kind === "libre" ? "Candidat libre" : c.schoolName || "-"}`,
    `Session : ${schoolYear(c.sessionYear)}`,
    `Série : ${c.serieCode} (${c.serieName})`,
    `Matricule : ${c.matricule}`,
  ].join("\n");
}

/** Extrait le matricule d'un QR lu : ligne complète, ou code saisi seul. */
export function extractMatricule(scanned: string): string | null {
  const depuisQr = scanned.match(/Matricule\s*:\s*([A-Z0-9-]+)/i)?.[1];
  if (depuisQr) return depuisQr.toUpperCase();
  // Saisie directe du matricule au clavier, sans passer par un QR.
  const seul = scanned.trim().toUpperCase();
  return /^BAC\d{4}-[A-Z0-9]+-\d{5}$/.test(seul) ? seul : null;
}

/** Extrait le jeton signé d'un QR lu (convocations de l'ancien format). */
export function extractToken(scanned: string) {
  return scanned.match(/MIA1\.[A-Za-z0-9_-]+/)?.[0] ?? null;
}

