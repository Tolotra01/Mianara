import {
  ApresArt,
  CalendrierArt,
  CoefficientsArt,
  DossierArt,
  JourJArt,
  PreparerArt,
  SerieLArt,
} from "@/components/illustrations/Spots";

/** Rubriques du guide, dans l'ordre du parcours du candidat. */
export const GUIDE_SECTIONS = [
  {
    slug: "series",
    title: "Les séries",
    short: "L, S ou OSE : laquelle te ressemble ?",
    Art: SerieLArt,
    tint: "bg-mena-soft",
  },
  {
    slug: "coefficients",
    title: "Les coefficients",
    short: "Le poids de chaque matière, et un simulateur de moyenne.",
    Art: CoefficientsArt,
    tint: "bg-vert-soft",
  },
  {
    slug: "dossier",
    title: "Le dossier",
    short: "Les pièces à préparer et les frais d'inscription.",
    Art: DossierArt,
    tint: "bg-soleil-soft",
  },
  {
    slug: "calendrier",
    title: "Le calendrier",
    short: "Inscriptions, épreuves, résultats : les dates clés.",
    Art: CalendrierArt,
    tint: "bg-info-soft",
  },
  {
    slug: "preparer",
    title: "Bien se préparer",
    short: "Une méthode simple pour réviser sans t'épuiser.",
    Art: PreparerArt,
    tint: "bg-mena-soft",
  },
  {
    slug: "jour-j",
    title: "Le jour J",
    short: "Ce qu'il faut emporter, et les règles à connaître.",
    Art: JourJArt,
    tint: "bg-soleil-soft",
  },
  {
    slug: "resultats",
    title: "Résultats et après",
    short: "Moyenne, mentions, relevé, orientation.",
    Art: ApresArt,
    tint: "bg-info-soft",
  },
] as const;

export type GuideSlug = (typeof GUIDE_SECTIONS)[number]["slug"];
