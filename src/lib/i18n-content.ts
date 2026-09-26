import { SERIES, SUBJECTS, TECH_SERIES } from "@/content/bac";
import type { Lang } from "./i18n";

/**
 * Noms des matières et des séries dans la langue choisie. Les noms malagasy
 * existent dans le référentiel (`nameMg`) ; à défaut, le nom français est gardé.
 */
const SUBJECT_MG = new Map(SUBJECTS.map((s) => [s.code, s.nameMg]));
const SERIE_MG = new Map([...SERIES, ...TECH_SERIES].map((s) => [s.code as string, s.nameMg]));

export function subjectName(code: string, name: string, lang: Lang = "fr"): string {
  return lang === "mg" ? (SUBJECT_MG.get(code) ?? name) : name;
}

export function serieName(code: string, name: string, lang: Lang = "fr"): string {
  return lang === "mg" ? (SERIE_MG.get(code) ?? name) : name;
}

type SerieText = { tagline: string; formerOptions: string; forWhom: string[]; careers: string[] };

/** Textes des séries en malagasy (les séries techniques n'ont que leurs métiers). */
const SERIE_TEXT_MG: Record<string, Partial<SerieText>> = {
  L: {
    tagline: "Ny fiteny, ny hevitra, ny teny.",
    formerOptions: "Misolo ny andiany A1 sy A2 taloha",
    forWhom: ["Tianao ny mamaky teny sy manoratra", "Tianao ny miady hevitra", "Mahay fiteny ianao"],
    careers: [
      "Literatiora sy fiteny",
      "Asa fanaovan-gazety",
      "Fampianarana",
      "Lalàna",
      "Fizahantany",
      "Fandikan-teny",
    ],
  },
  S: {
    tagline: "Ny isa, ny zava-manan'aina, ny zavatra.",
    formerOptions: "Misolo ny andiany C sy D taloha",
    forWhom: ["Tianao ny mamaha olana", "Liana amin'ny zava-manan'aina ianao", "Tianao ny manao andrana"],
    careers: ["Fitsaboana", "Injeniera", "Informatika", "Agronomia", "Fanafody", "Fikarohana"],
  },
  OSE: {
    tagline: "Mahatakatra sy mandamina ny fiarahamonina.",
    formerOptions: "Andiany noforonin'ny fanavaozana, ao amin'ny Bacc nanomboka tamin'ny 2021",
    forWhom: ["Liana amin'ny toekarena ianao", "Tianao ny vaovao", "Te hitantana sy handamina ianao"],
    careers: ["Toekarena sy fitantanana", "Lalàna", "Sosiolojia", "Varotra", "Banky", "Fitantanan-draharaha"],
  },
  TI: { careers: ["Herinaratra", "Mekanika", "Fikojakojana", "Elektronika"] },
  TGC: { careers: ["Fanorenana trano", "Asa vaventy", "Topografia", "Fitarihana toeram-piasana"] },
  TT: { careers: ["Kaonty", "Varotra", "Fitantanana", "Sekretera"] },
  TA: { careers: ["Agronomia", "Fiompiana", "Fanodinana sakafo", "Tontolo iainana"] },
};

/** Accroche, publics et métiers d'une série dans la langue choisie. */
export function serieText<S extends Partial<SerieText> & { code: string }>(s: S, lang: Lang = "fr"): S {
  return lang === "mg" ? { ...s, ...SERIE_TEXT_MG[s.code] } : s;
}
