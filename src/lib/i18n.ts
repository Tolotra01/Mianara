/**
 * Textes de l'interface en français et en malagasy.
 * Les formulations malagasy sont indicatives : à relire par un locuteur
 * natif avant publication (charte graphique v2, « Voix et ton »).
 */
export type Lang = "fr" | "mg";
export const LANG_COOKIE = "mianara-lang";

const fr = {
  nav: {
    home: "Accueil",
    guide: "Guide",
    news: "Actualités",
    help: "Aide",
    login: "Connexion",
    space: "Mon espace",
  },
  skip: "Aller au contenu",
  menu: "Menu",
  langLabel: "Langue",
  hero: {
    mini: "Obtenir",
    overline: "Ton Bacc,",
    title: "Pas à pas.",
    lead: "Séries, coefficients, dossier, jour J : tout ce qu'il faut savoir, en images.",
    ctaGuide: "Ouvrir le guide",
    ctaAssistant: "Poser une question",
  },
  journey: {
    overline: "Le parcours",
    title: "Cinq étapes jusqu'au diplôme",
    steps: ["Choisir sa série", "Déposer son dossier", "Réviser", "Le jour J", "Résultats"],
  },
  series: {
    overline: "Les séries",
    title: "Trois séries, trois chemins",
    core: "Coefficient 5",
    more: "Découvrir",
  },
  figures: {
    overline: "L'essentiel en un coup d'œil",
    title: "Le Bacc en quatre chiffres",
    items: [
      { value: "30", label: "coefficients au total" },
      { value: "10/20", label: "pour être admis" },
      { value: "1", label: "seule session par an" },
      { value: "0", label: "est éliminatoire" },
    ],
  },
  assistant: {
    overline: "Assistant IA",
    title: "Une question ? Demande à l'assistant.",
    lead: "Il répond en français ou en malagasy, à partir des informations officielles du guide.",
    cta: "Discuter avec l'assistant",
    examples: [
      "Quels sont les documents nécessaires pour m'inscrire ?",
      "Quels sont les coefficients en série S ?",
      "Quelle moyenne visée pour avoir une mention Bien ?",
    ],
  },
  news: {
    overline: "Actualités",
    title: "Les dernières nouvelles du Bacc",
    all: "Toutes les actualités",
    read: "Lire la suite",
  },
  footer: {
    tagline: "Mianara, mandroso. — Apprendre, avancer.",
    guide: "Guide du Bacc",
    about: "Mianara",
    official: "Liens officiels",
    results: "Résultats du Bacc",
    disclaimer:
      "Mianara n'est pas un site officiel du ministère. Vérifiez toujours les dates et pièces auprès de votre établissement ou de l'Office du Bacc.",
  },
  chat: {
    title: "Assistant Mianara",
    subtitle: "Répond en français ou en malagasy",
    placeholder: "Écris ta question…",
    send: "Envoyer",
    open: "Ouvrir l'assistant",
    close: "Fermer",
    hello:
      "Salama ! Je réponds à tes questions sur le Bacc : séries, coefficients, dossier, dates, résultats.",
    disclaimer: "L'IA peut se tromper. Pour une décision officielle, adressez-vous à l'Office du Bacc.",
    error: "L'assistant n'est pas disponible pour le moment. Réessaie dans un instant.",
    reset: "Nouvelle conversation",
  },
};

export type Dict = typeof fr;

const mg: Dict = {
  nav: {
    home: "Fandraisana",
    guide: "Torolalana",
    news: "Vaovao",
    help: "Fanampiana",
    login: "Hiditra",
    space: "Ny toerako",
  },
  skip: "Mankany amin'ny votoaty",
  menu: "Menio",
  langLabel: "Fiteny",
  hero: {
    mini: "Mahazoa",
    overline: "Ny Bacc-nao, ",
    title: "Dingana tsikelikely.",
    lead: "Andiany, coefficient, antontan-taratasy, andro fanadinana : izay rehetra tokony ho fantatra, an-tsary.",
    ctaGuide: "Jereo ny torolalana",
    ctaAssistant: "Hametraka fanontaniana",
  },
  journey: {
    overline: "Ny dia",
    title: "Dingana dimy mankany amin'ny diplaoma",
    steps: [
      "Misafidy andiany",
      "Mametraka antontan-taratasy",
      "Mamerina lesona",
      "Andro fanadinana",
      "Valiny",
    ],
  },
  series: {
    overline: "Ny andiany",
    title: "Andiany telo, lalana telo",
    core: "Coefficient 5",
    more: "Hijery",
  },
  figures: {
    overline: "Ny zava-drehetra amin'ny fijerena iray",
    title: "Ny Bacc amin'ny isa efatra",
    items: [
      { value: "30", label: "coefficient raha atambatra" },
      { value: "10/20", label: "vao afaka" },
      { value: "1", label: "fanadinana indray mandeha isan-taona" },
      { value: "0", label: "dia manala anao" },
    ],
  },
  assistant: {
    overline: "Mpanampy IA",
    title: "Manana fanontaniana ? Anontanio ny mpanampy.",
    lead: "Mamaly amin'ny teny malagasy na frantsay izy, miorina amin'ny torolalana ofisialy.",
    cta: "Hiresaka amin'ny mpanampy",
    examples: [
      "Inona avy ireo taratasy ilaina amin'ny fisoratana anarana ?",
      "Firy ny coefficient amin'ny andiany S ?",
      "Firy ny salan'isa ilaina amin'ny mention Bien ?",
    ],
  },
  news: {
    overline: "Vaovao",
    title: "Vaovao farany momba ny Bacc",
    all: "Ny vaovao rehetra",
    read: "Hijery ny vaovao",
  },
  footer: {
    tagline: "Mianara, mandroso.",
    guide: "Torolalana Bacc",
    about: "Mianara",
    official: "Rohy ofisialy",
    results: "Valim-panadinana Bacc",
    disclaimer:
      "Tsy tranonkala ofisialin'ny minisitera i Mianara. Hamarino foana ny daty sy ny taratasy any amin'ny sekolinao na ny Office du Bacc.",
  },
  chat: {
    title: "Mpanampy Mianara",
    subtitle: "Mamaly amin'ny teny malagasy na frantsay",
    placeholder: "Soraty ny fanontanianao…",
    send: "Alefa",
    open: "Sokafy ny mpanampy",
    close: "Hidio",
    hello:
      "Salama ! Mamaly ny fanontanianao momba ny Bacc aho : andiany, coefficient, antontan-taratasy, daty, valiny.",
    disclaimer: "Mety diso ny IA. Ho an'ny fanapahan-kevitra ofisialy, manatona ny Office du Bacc.",
    error: "Tsy misy ny mpanampy amin'izao fotoana izao. Andramo indray afaka kelikely.",
    reset: "Resaka vaovao",
  },
};

export const dict: Record<Lang, Dict> = { fr, mg };

export function isLang(value: unknown): value is Lang {
  return value === "fr" || value === "mg";
}

/* ------------------------------------------------------------------ */
/* Mots communs aux pages intérieures et utilitaires de langue         */
/* ------------------------------------------------------------------ */

export const COMMON = {
  fr: {
    guide: "Guide",
    guideHome: "Sommaire du guide",
    guideNav: "Rubriques du guide",
    breadcrumb: "Fil d'Ariane",
    previous: "Précédent",
    next: "Suivant",
    step: "Étape",
    source: "Source",
    toConfirm: "À confirmer",
    series: "Série",
    frenchOnly: "",
  },
  mg: {
    guide: "Torolalana",
    guideHome: "Lahatahirin'ny torolalana",
    guideNav: "Fizarana amin'ny torolalana",
    breadcrumb: "Toerana misy anao",
    previous: "Teo aloha",
    next: "Manaraka",
    step: "Dingana",
    source: "Loharano",
    toConfirm: "Mbola hohamafisina",
    series: "Andiany",
    frenchOnly:
      "Mbola amin'ny teny frantsay ny sasany amin'ireo votoaty eto (fanazavana, lisitra, vaovao) : eo am-pandikana izy ireo.",
  },
} as const;

const MONTHS_MG = [
  "Janoary",
  "Febroary",
  "Martsa",
  "Aprily",
  "Mey",
  "Jona",
  "Jolay",
  "Aogositra",
  "Septambra",
  "Oktobra",
  "Novambra",
  "Desambra",
];

/** Date longue (« 18 septembre 2026 » / « 18 Septambra 2026 »). */
export function formatDateLang(iso: string, lang: Lang = "fr"): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (lang === "mg") return `${d.getUTCDate()} ${MONTHS_MG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Catégories des actualités (saisies en français dans la base). */
const NEWS_CATEGORY_MG: Record<string, string> = {
  Réforme: "Fanavaozana",
  Inscription: "Fisoratana anarana",
  Calendrier: "Tetiandro",
  Épreuves: "Fanadinana",
  Résultats: "Valiny",
  Orientation: "Fitarihana",
};

export function newsCategory(category: string, lang: Lang = "fr"): string {
  return lang === "mg" ? (NEWS_CATEGORY_MG[category] ?? category) : category;
}

/** Mentions du Bacc, par clé (`RULES.mentions`). */
const MENTION_MG: Record<string, string> = {
  passable: "Antonony",
  assez_bien: "Tsara ihany",
  bien: "Tsara",
  tres_bien: "Tsara dia tsara",
};

export function mentionLabel(key: string, label: string, lang: Lang = "fr"): string {
  return lang === "mg" ? (MENTION_MG[key] ?? label) : label;
}
