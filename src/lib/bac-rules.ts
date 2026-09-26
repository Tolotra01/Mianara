/**
 * Règles métier du Bacc (décret n° 2021-242 et cahier BacConnect, section 6).
 * Fonctions pures, sans accès à la base : elles se testent isolément.
 */

export const TIME_ZONE = "Indian/Antananarivo"; // UTC+3, sans heure d'été
const TZ_OFFSET = "+03:00";

/* ---------- Dates (heure de Madagascar) ---------- */

/** « 2027-08-16T07:00 » saisi dans un formulaire → instant UTC. */
export function parseLocalDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Instant → « 2027-08-16T07:00 » pour un champ datetime-local. */
export function toLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  const local = new Date(date.getTime() + 3 * 3600 * 1000);
  return local.toISOString().slice(0, 16);
}

export const formatDateTime = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
export const formatDate = (d: Date | string) =>
  new Date(typeof d === "string" && d.length === 10 ? `${d}T12:00:00Z` : d).toLocaleDateString("fr-FR", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export const formatTime = (d: Date | string) =>
  new Date(d).toLocaleTimeString("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
export const formatDay = (d: Date | string) =>
  new Date(d).toLocaleDateString("fr-FR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const formatAriary = (n: number) => `${n.toLocaleString("fr-FR")} Ar`;

/* ---------- Matricule ---------- */

/** RG-03 : BAC{année}-{série}-{numéro sur 5 chiffres}. */
export const formatMatricule = (year: number, serie: string, n: number) =>
  `BAC${year}-${serie}-${String(n).padStart(5, "0")}`;

export const formatRequestNumber = (type: "transcript" | "diploma", year: number, n: number) =>
  `${type === "transcript" ? "REL" : "DIP"}-${year}-${String(n).padStart(6, "0")}`;

/* ---------- Résultats ---------- */

export type Mention = "passable" | "assez_bien" | "bien" | "tres_bien";
export type Decision = "admitted" | "failed" | "fraud" | "absent";

export const MENTION_LABEL: Record<Mention, string> = {
  passable: "Passable",
  assez_bien: "Assez bien",
  bien: "Bien",
  tres_bien: "Très bien",
};

export const DECISION_LABEL: Record<Decision, string> = {
  admitted: "Admis",
  failed: "Ajourné",
  fraud: "Fraude",
  absent: "Absent",
};

export function mentionFor(average: number): Mention {
  if (average >= 16) return "tres_bien";
  if (average >= 14) return "bien";
  if (average >= 12) return "assez_bien";
  return "passable";
}

export type ResultInput = {
  subjects: { subjectId: number; coefficient: number }[];
  scores: Map<number, number>; // subjectId → note /20
  hasFraud: boolean;
  wasPresent: boolean; // au moins une entrée scannée ou une note saisie
  threshold: number; // seuil du jury, ≥ 9,50
};

export type ResultOutput = {
  average: number | null;
  decision: Decision;
  mention: Mention | null;
  eliminatory: boolean;
  missing: number;
};

/**
 * Moyenne = Σ(note × coefficient) / Σ coefficients (RG-10).
 * Une note manquante vaut 0 (absence) et un 0 est éliminatoire, sauf décision du jury.
 */
export function computeResult(input: ResultInput): ResultOutput {
  const totalCoef = input.subjects.reduce((s, x) => s + x.coefficient, 0);
  const missing = input.subjects.filter((x) => !input.scores.has(x.subjectId)).length;
  const sum = input.subjects.reduce((s, x) => s + (input.scores.get(x.subjectId) ?? 0) * x.coefficient, 0);
  const average = totalCoef ? Math.round((sum / totalCoef) * 100) / 100 : null;
  const eliminatory = input.subjects.some((x) => (input.scores.get(x.subjectId) ?? 0) === 0);

  if (input.hasFraud) return { average, decision: "fraud", mention: null, eliminatory, missing };
  if (!input.wasPresent) return { average: null, decision: "absent", mention: null, eliminatory, missing };
  if (average == null || eliminatory || average < input.threshold) {
    return { average, decision: "failed", mention: null, eliminatory, missing };
  }
  return { average, decision: "admitted", mention: mentionFor(Math.max(average, 10)), eliminatory, missing };
}

/* ---------- Scans pendant les épreuves ---------- */

export type ScanType = "entry" | "exit" | "return" | "end" | "fraud";

export const SCAN_LABEL: Record<ScanType | "doc_delivery", string> = {
  entry: "Entrée en salle",
  exit: "Sortie temporaire",
  return: "Retour en salle",
  end: "Fin d'épreuve (copie remise)",
  fraud: "Fraude",
  doc_delivery: "Remise de document",
};

export const ENTRY_OPENS_MIN = 30; // RG-05 : ouverture 30 min avant le début
export const END_CLOSES_MIN = 30; // RG-06 : fermeture 30 min après la fin

export type ScanState = { entered: boolean; out: boolean; ended: boolean; fraud: boolean };

/** État d'un candidat pour une épreuve, à partir de ses scans (dans l'ordre chronologique). */
export function scanState(types: string[]): ScanState {
  const state: ScanState = { entered: false, out: false, ended: false, fraud: false };
  for (const t of types) {
    if (t === "entry") state.entered = true;
    if (t === "exit") state.out = true;
    if (t === "return") state.out = false;
    if (t === "end") state.ended = true;
    if (t === "fraud") state.fraud = true;
  }
  return state;
}

/** Fenêtre pendant laquelle un surveillant peut scanner pour cette épreuve. */
export function scanWindow(exam: { startsAt: Date; endsAt: Date }) {
  return {
    opens: new Date(exam.startsAt.getTime() - ENTRY_OPENS_MIN * 60_000),
    closes: new Date(exam.endsAt.getTime() + END_CLOSES_MIN * 60_000),
  };
}

/**
 * Vérifie qu'une action est permise maintenant. Renvoie `null` si oui,
 * sinon la raison du refus, affichée au surveillant.
 */
export function checkScan(
  action: ScanType,
  state: ScanState,
  exam: { startsAt: Date; endsAt: Date },
  now: Date,
): string | null {
  const { opens, closes } = scanWindow(exam);
  const t = now.getTime();
  const start = exam.startsAt.getTime();
  const end = exam.endsAt.getTime();

  if (t < opens.getTime()) return "Le contrôle ouvre 30 minutes avant le début de l'épreuve.";
  if (t > closes.getTime()) return "Le contrôle de cette épreuve est fermé.";

  switch (action) {
    case "entry":
      if (state.entered) return "Entrée déjà enregistrée pour cette épreuve.";
      if (t > start) return "L'épreuve a commencé : aucun retard n'est accepté.";
      return null;
    case "exit":
      if (!state.entered) return "Candidat absent à l'entrée.";
      if (state.ended) return "Copie déjà remise.";
      if (state.out) return "Sortie déjà en cours : enregistrez d'abord le retour.";
      if (t < start || t > end) return "Les sorties ne sont possibles que pendant l'épreuve.";
      return null;
    case "return":
      if (!state.out) return "Aucune sortie en cours.";
      return null;
    case "end":
      if (!state.entered) return "Un candidat absent à l'entrée ne peut pas remettre de copie.";
      if (state.ended) return "Copie déjà remise.";
      if (state.out) return "Le candidat est sorti : enregistrez d'abord son retour.";
      if (t < start) return "L'épreuve n'a pas commencé.";
      return null;
    case "fraud":
      if (!state.entered) return "Candidat absent à l'entrée.";
      if (state.fraud) return "Fraude déjà signalée pour cette épreuve.";
      return null;
  }
}

/** Actions proposées au surveillant pour cet état (les boutons affichés). */
export function availableActions(
  state: ScanState,
  exam: { startsAt: Date; endsAt: Date },
  now: Date,
): ScanType[] {
  return (["entry", "exit", "return", "end", "fraud"] as const).filter(
    (a) => checkScan(a, state, exam, now) === null,
  );
}
