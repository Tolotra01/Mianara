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
    titleMg: "Ny andiany",
    shortMg: "L, S sa OSE : iza no mifanaraka aminao ?",
    Art: SerieLArt,
    tint: "bg-mena-soft",
  },
  {
    slug: "coefficients",
    title: "Les coefficients",
    short: "Le poids de chaque matière, et un simulateur de moyenne.",
    titleMg: "Ny coefficient",
    shortMg: "Ny lanjan'ny taranja tsirairay, sy fikajiana ny salan'isa.",
    Art: CoefficientsArt,
    tint: "bg-vert-soft",
  },
  {
    slug: "dossier",
    title: "Le dossier",
    short: "Les pièces à préparer et les frais d'inscription.",
    titleMg: "Ny antontan-taratasy",
    shortMg: "Ny taratasy tokony homanina sy ny saran'ny fisoratana anarana.",
    Art: DossierArt,
    tint: "bg-soleil-soft",
  },
  {
    slug: "calendrier",
    title: "Le calendrier",
    short: "Inscriptions, épreuves, résultats : les dates clés.",
    titleMg: "Ny tetiandro",
    shortMg: "Fisoratana anarana, fanadinana, valiny : ireo daty lehibe.",
    Art: CalendrierArt,
    tint: "bg-info-soft",
  },
  {
    slug: "preparer",
    title: "Bien se préparer",
    short: "Une méthode simple pour réviser sans t'épuiser.",
    titleMg: "Miomana tsara",
    shortMg: "Fomba tsotra hanaovana famerenana nefa tsy ho reraka.",
    Art: PreparerArt,
    tint: "bg-mena-soft",
  },
  {
    slug: "jour-j",
    title: "Le jour J",
    short: "Ce qu'il faut emporter, et les règles à connaître.",
    titleMg: "Ny andro J",
    shortMg: "Izay tokony ho entina, sy ireo fitsipika tokony ho fantatra.",
    Art: JourJArt,
    tint: "bg-soleil-soft",
  },
  {
    slug: "resultats",
    title: "Résultats et après",
    short: "Moyenne, mentions, relevé, orientation.",
    titleMg: "Ny valiny sy ny manaraka",
    shortMg: "Salan'isa, mention, taratasy fanamarinana, fitarihana.",
    Art: ApresArt,
    tint: "bg-info-soft",
  },
] as const;

/** Titre et accroche d'une rubrique dans la langue choisie. */
export function sectionText(s: (typeof GUIDE_SECTIONS)[number], lang: "fr" | "mg") {
  return lang === "mg" ? { title: s.titleMg, short: s.shortMg } : { title: s.title, short: s.short };
}

export type GuideSlug = (typeof GUIDE_SECTIONS)[number]["slug"];
