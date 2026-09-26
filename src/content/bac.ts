/**
 * Données de référence du Baccalauréat de l'enseignement général à Madagascar.
 *
 * Ce fichier sert à la fois :
 *  - de jeu de données initial pour PostgreSQL (voir src/db/seed.ts) ;
 *  - de repli quand DATABASE_URL n'est pas défini (développement sans base).
 *
 * Chaque information porte `confirmed` : false signifie « à vérifier auprès de
 * l'Office du Bac » et s'affiche comme tel dans l'interface.
 */

export type SerieCode = "L" | "S" | "OSE";
export type CandidateType = "tous" | "ecole" | "libre";
export type NewsImportance = "low" | "normal" | "high" | "urgent";

export const SOURCES = {
  decret2021: {
    label: "Décret n° 2021-242 portant réorganisation du Baccalauréat",
    url: "https://textes.lexxika.com/wp-content/uploads/2024/05/Decret-2021-242-03-Mars-2021-portant-reorganisation-de-lexamen-du-Baccalaureat-de-lEnseignement-General.pdf",
  },
  coefficients2027: {
    label: "2424.mg — Coefficients des séries L, S et OSE révisés (18/09/2026)",
    url: "https://www.2424.mg/education-les-coefficients-du-baccalaureat-des-series-l-s-et-ose-revises-dans-le-nouveau-programme-detudes/",
  },
  reforme2027: {
    label: "2424.mg — Le Bac 2027 limité aux séries L, S et OSE",
    url: "https://www.2424.mg/education-le-baccalaureat-general-de-2027-limite-aux-series-l-s-et-ose-avec-la-mise-a-lechelle-du-nouveau-programme-scolaire-et-la-disparitions-des-series-a-c-et-d/",
  },
  suppressionACD: {
    label: "L'Express / allAfrica — Les séries A, C et D supprimées (10/09/2026)",
    url: "https://fr.allafrica.com/stories/202609100504.html",
  },
  calendrier2026: {
    label: "2424.mg — Le Bac 2026 fixé du 17 au 27 août (13/01/2026)",
    url: "https://2424.mg/news/examen-officiel-le-baccalaureat-2026-fixe-du-17-au-27-aout/",
  },
  dateLimite2026: {
    label: "2424.mg — Date limite d'inscription au Bac 2026 fixée au 27 mars",
    url: "https://2424.mg/examen-officiel-la-date-limite-dinscription-au-baccalaureat-2026-fixee-au-27-mars/",
  },
  inscriptions2026: {
    label: "L'Express / allAfrica — Les candidats boudent l'inscription (19/03/2026)",
    url: "https://fr.allafrica.com/stories/202603190247.html",
  },
  frais2026: {
    label: "Moov.mg — Année scolaire 2025-2026 des candidats au Bac (14/01/2026)",
    url: "https://moov.mg/article/111203-enseignement-lannee-scolaire-2025-2026-des-candidats-au-baccalaureat-setendra-sur-11-mois",
  },
  eps: {
    label: "Newsmada — EPS : coefficient 2 pour les nouvelles séries (11/06/2024)",
    url: "https://newsmada.com/2024/06/11/eps-baccalaureat-une-epreuve-a-coefficient-2-pour-les-nouvelles-series/",
  },
  resultats: {
    label: "Résultats officiels du Baccalauréat",
    url: "https://bacc.digital.gov.mg/",
  },
  mesupres: {
    label: "MESUPRES — Résultats du Baccalauréat",
    url: "https://www.mesupres.gov.mg/resultatsBac",
  },
  postBac: {
    label: "Simoon CV — Bac 2026 : proclamation et post-Bac",
    url: "https://simoon-cv.com/blog/resultats-bac-2026-madagascar-mesupres-proclamation",
  },
} as const;

export type SourceKey = keyof typeof SOURCES;

/* ------------------------------------------------------------------ */
/* Séries                                                             */
/* ------------------------------------------------------------------ */

export type Serie = {
  code: SerieCode;
  name: string;
  nameMg: string;
  tagline: string;
  description: string;
  forWhom: string[];
  careers: string[];
  formerOptions: string;
  sortOrder: number;
};

export const SERIES: Serie[] = [
  {
    code: "L",
    name: "Littéraire",
    nameMg: "Literatiora",
    tagline: "Les langues, les idées, les mots.",
    description:
      "Trois langues au cœur de la série (malagasy, français, anglais), avec la philosophie et l'histoire-géographie.",
    forWhom: ["Tu aimes lire et écrire", "Tu aimes débattre", "Tu es à l'aise en langues"],
    careers: ["Lettres et langues", "Journalisme", "Enseignement", "Droit", "Tourisme", "Traduction"],
    formerOptions: "Remplace les anciennes séries A1 et A2",
    sortOrder: 1,
  },
  {
    code: "S",
    name: "Scientifique",
    nameMg: "Siantifika",
    tagline: "Les chiffres, le vivant, la matière.",
    description:
      "Mathématiques, physique-chimie et sciences de la vie et de la Terre (SVT) portent toute la série.",
    forWhom: ["Tu aimes résoudre des problèmes", "Tu es curieux du vivant", "Tu aimes expérimenter"],
    careers: ["Médecine", "Ingénierie", "Informatique", "Agronomie", "Pharmacie", "Recherche"],
    formerOptions: "Remplace les anciennes séries C et D",
    sortOrder: 2,
  },
  {
    code: "OSE",
    name: "Organisation, Société, Économie",
    nameMg: "Fandaminana, Fiarahamonina, Toekarena",
    tagline: "Comprendre et organiser la société.",
    description:
      "Mathématiques, histoire-géographie et sciences économiques et sociales (SES), une matière propre à cette série.",
    forWhom: ["Tu t'intéresses à l'économie", "Tu aimes l'actualité", "Tu veux gérer, organiser"],
    careers: ["Économie et gestion", "Droit", "Sociologie", "Commerce", "Banque", "Administration"],
    formerOptions: "Série créée par la réforme, au Bac depuis 2021",
    sortOrder: 3,
  },
];

/* ------------------------------------------------------------------ */
/* Matières et coefficients (terminale, à partir de 2026-2027)         */
/* ------------------------------------------------------------------ */

export type Subject = { code: string; name: string; nameMg: string };

export const SUBJECTS: Subject[] = [
  { code: "MLG", name: "Malagasy", nameMg: "Malagasy" },
  { code: "FRA", name: "Français", nameMg: "Frantsay" },
  { code: "ANG", name: "Anglais", nameMg: "Anglisy" },
  { code: "PHI", name: "Philosophie", nameMg: "Filozofia" },
  { code: "HG", name: "Histoire-géographie", nameMg: "Tantara sy jeografia" },
  { code: "MATH", name: "Mathématiques", nameMg: "Matematika" },
  { code: "PC", name: "Physique-chimie", nameMg: "Fizika sy simia" },
  { code: "SVT", name: "SVT", nameMg: "Siansa momba ny fiainana sy ny tany" },
  { code: "SES", name: "Sciences économiques et sociales", nameMg: "Siansa ara-toekarena sy sosialy" },
  { code: "LV2", name: "Langue vivante 2", nameMg: "Fiteny vahiny faharoa" },
  { code: "AUT", name: "Autres disciplines", nameMg: "Taranja hafa" },
];

export type SerieSubject = {
  serieCode: SerieCode;
  subjectCode: string;
  coefficient: number;
  isCore: boolean;
  confirmed: boolean;
  note?: string;
};

const AUTRES_NOTE =
  "Complément jusqu'au total de 30 annoncé (philosophie, EPS…) : répartition exacte à confirmer par l'arrêté officiel.";

export const SERIE_SUBJECTS: SerieSubject[] = [
  // Série L — total 30
  { serieCode: "L", subjectCode: "MLG", coefficient: 5, isCore: true, confirmed: true },
  { serieCode: "L", subjectCode: "FRA", coefficient: 5, isCore: true, confirmed: true },
  {
    serieCode: "L",
    subjectCode: "ANG",
    coefficient: 5,
    isCore: true,
    confirmed: true,
    note: "Devient matière de base",
  },
  {
    serieCode: "L",
    subjectCode: "PHI",
    coefficient: 4,
    isCore: false,
    confirmed: true,
    note: "Passe de 5 à 4",
  },
  { serieCode: "L", subjectCode: "HG", coefficient: 3, isCore: false, confirmed: true },
  { serieCode: "L", subjectCode: "MATH", coefficient: 1, isCore: false, confirmed: true },
  { serieCode: "L", subjectCode: "PC", coefficient: 1, isCore: false, confirmed: true },
  { serieCode: "L", subjectCode: "SVT", coefficient: 1, isCore: false, confirmed: true },
  {
    serieCode: "L",
    subjectCode: "LV2",
    coefficient: 1,
    isCore: false,
    confirmed: true,
    note: "Espagnol, russe ou allemand",
  },
  { serieCode: "L", subjectCode: "AUT", coefficient: 4, isCore: false, confirmed: false, note: AUTRES_NOTE },

  // Série S — total 30
  { serieCode: "S", subjectCode: "MATH", coefficient: 5, isCore: true, confirmed: true },
  { serieCode: "S", subjectCode: "PC", coefficient: 5, isCore: true, confirmed: true },
  { serieCode: "S", subjectCode: "SVT", coefficient: 5, isCore: true, confirmed: true },
  { serieCode: "S", subjectCode: "MLG", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "S", subjectCode: "FRA", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "S", subjectCode: "ANG", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "S", subjectCode: "HG", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "S", subjectCode: "AUT", coefficient: 7, isCore: false, confirmed: false, note: AUTRES_NOTE },

  // Série OSE — total 30
  { serieCode: "OSE", subjectCode: "MATH", coefficient: 5, isCore: true, confirmed: true },
  { serieCode: "OSE", subjectCode: "HG", coefficient: 5, isCore: true, confirmed: true },
  { serieCode: "OSE", subjectCode: "SES", coefficient: 5, isCore: true, confirmed: true },
  { serieCode: "OSE", subjectCode: "FRA", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "OSE", subjectCode: "MLG", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "OSE", subjectCode: "ANG", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "OSE", subjectCode: "PC", coefficient: 2, isCore: false, confirmed: true },
  { serieCode: "OSE", subjectCode: "SVT", coefficient: 2, isCore: false, confirmed: true },
  {
    serieCode: "OSE",
    subjectCode: "AUT",
    coefficient: 5,
    isCore: false,
    confirmed: false,
    note: AUTRES_NOTE,
  },
];

/* ------------------------------------------------------------------ */
/* Règles de réussite (décret n° 2021-242)                            */
/* ------------------------------------------------------------------ */

export const RULES = {
  admissionAverage: 10,
  juryFloor: 9.5,
  mentions: [
    { key: "passable", label: "Passable", min: 10, max: 12 },
    { key: "assez_bien", label: "Assez bien", min: 12, max: 14 },
    { key: "bien", label: "Bien", min: 14, max: 16 },
    { key: "tres_bien", label: "Très bien", min: 16, max: 20 },
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Frais d'inscription                                                */
/* ------------------------------------------------------------------ */

export type Fee = {
  candidateType: "ecole" | "libre" | "etranger";
  label: string;
  amountAriary: number;
  sessionYear: number;
  source: SourceKey;
};

export const FEES: Fee[] = [
  {
    candidateType: "ecole",
    label: "Candidat d'école",
    amountAriary: 15000,
    sessionYear: 2026,
    source: "frais2026",
  },
  {
    candidateType: "libre",
    label: "Candidat libre",
    amountAriary: 50000,
    sessionYear: 2026,
    source: "frais2026",
  },
  {
    candidateType: "etranger",
    label: "Candidat étranger scolarisé à Madagascar",
    amountAriary: 100000,
    sessionYear: 2026,
    source: "frais2026",
  },
];

/* ------------------------------------------------------------------ */
/* Dossier d'inscription                                              */
/* ------------------------------------------------------------------ */

export type DossierItem = {
  label: string;
  detail: string;
  candidateType: CandidateType;
  icon: string;
  confirmed: boolean;
  sortOrder: number;
};

export const DOSSIER_ITEMS: DossierItem[] = [
  {
    label: "Fiche d'inscription remplie",
    detail: "Fournie par votre lycée ou par l'Office du Bac. Vérifiez chaque lettre de votre nom.",
    candidateType: "tous",
    icon: "file-pen",
    confirmed: false,
    sortOrder: 1,
  },
  {
    label: "Copie d'acte de naissance",
    detail: "Récente et lisible. Le nom doit être écrit exactement comme sur la fiche.",
    candidateType: "tous",
    icon: "scroll-text",
    confirmed: false,
    sortOrder: 2,
  },
  {
    label: "Photos d'identité",
    detail: "Récentes, fond clair. Demandez le nombre exact à votre établissement.",
    candidateType: "tous",
    icon: "camera",
    confirmed: false,
    sortOrder: 3,
  },
  {
    label: "Pièce d'identité",
    detail: "Copie de la CIN si vous avez 18 ans ou plus.",
    candidateType: "tous",
    icon: "id-card",
    confirmed: false,
    sortOrder: 4,
  },
  {
    label: "Reçu du droit d'inscription",
    detail: "15 000 Ar (école), 50 000 Ar (libre) — tarifs de la session 2026.",
    candidateType: "tous",
    icon: "receipt",
    confirmed: true,
    sortOrder: 5,
  },
  {
    label: "Certificat de scolarité en terminale",
    detail: "Délivré par votre lycée, qui dépose ensuite le dossier pour vous.",
    candidateType: "ecole",
    icon: "school",
    confirmed: false,
    sortOrder: 6,
  },
  {
    label: "Dépôt dans votre secteur de résidence",
    detail: "Sans établissement, vous passez l'examen là où vous habitez (décret 2021-242, art. 7).",
    candidateType: "libre",
    icon: "map-pin",
    confirmed: true,
    sortOrder: 7,
  },
];

/* ------------------------------------------------------------------ */
/* Calendrier                                                         */
/* ------------------------------------------------------------------ */

export type CalendarEvent = {
  sessionYear: number;
  title: string;
  startsOn: string; // AAAA-MM-JJ
  endsOn?: string;
  dateLabel: string;
  kind: "inscription" | "examen" | "resultats" | "reforme";
  confirmed: boolean;
  source: SourceKey;
};

export const CALENDAR: CalendarEvent[] = [
  {
    sessionYear: 2026,
    title: "Ouverture des inscriptions",
    startsOn: "2026-01-12",
    dateLabel: "12 janvier 2026",
    kind: "inscription",
    confirmed: true,
    source: "calendrier2026",
  },
  {
    sessionYear: 2026,
    title: "Clôture des inscriptions (18 h), sans dérogation",
    startsOn: "2026-03-27",
    dateLabel: "27 mars 2026",
    kind: "inscription",
    confirmed: true,
    source: "inscriptions2026",
  },
  {
    sessionYear: 2026,
    title: "Épreuves du Bac général (dès 7 h)",
    startsOn: "2026-08-17",
    endsOn: "2026-08-21",
    dateLabel: "17 → 21 août 2026",
    kind: "examen",
    confirmed: true,
    source: "calendrier2026",
  },
  {
    sessionYear: 2026,
    title: "Proclamation des résultats, province par province",
    startsOn: "2026-08-18",
    endsOn: "2026-08-31",
    dateLabel: "Fin août 2026",
    kind: "resultats",
    confirmed: true,
    source: "postBac",
  },
  {
    sessionYear: 2027,
    title: "Décret : fin des séries A, C et D",
    startsOn: "2026-08-31",
    dateLabel: "31 août 2026",
    kind: "reforme",
    confirmed: true,
    source: "reforme2027",
  },
  {
    sessionYear: 2027,
    title: "Ouverture des inscriptions au Bac 2027 (séries L, S, OSE)",
    startsOn: "2027-01-01",
    dateLabel: "Janvier 2027",
    kind: "inscription",
    confirmed: true,
    source: "suppressionACD",
  },
  {
    sessionYear: 2027,
    title: "Dates des épreuves du Bac 2027",
    startsOn: "2027-08-01",
    dateLabel: "À publier par le ministère",
    kind: "examen",
    confirmed: false,
    source: "reforme2027",
  },
];

/* ------------------------------------------------------------------ */
/* Conseils (préparation, jour J, après)                              */
/* ------------------------------------------------------------------ */

export type Tip = {
  category: "preparer" | "jour_j" | "apres";
  title: string;
  body: string;
  icon: string;
  sortOrder: number;
};

export const TIPS: Tip[] = [
  // Préparer
  {
    category: "preparer",
    title: "Vise les coefficients 5",
    body: "Trois matières pèsent la moitié de ta note. Commence par elles.",
    icon: "target",
    sortOrder: 1,
  },
  {
    category: "preparer",
    title: "Refais les annales",
    body: "Les sujets des années passées montrent le format et le niveau attendus.",
    icon: "files",
    sortOrder: 2,
  },
  {
    category: "preparer",
    title: "Un planning simple",
    body: "Une matière par jour, un sujet blanc par semaine, un jour léger.",
    icon: "calendar-days",
    sortOrder: 3,
  },
  {
    category: "preparer",
    title: "Ne laisse aucune matière",
    body: "Un 0 est éliminatoire. Même à coefficient 1, chaque épreuve compte.",
    icon: "shield-alert",
    sortOrder: 4,
  },
  {
    category: "preparer",
    title: "Dors, bouge, mange",
    body: "Le cerveau retient mieux après une vraie nuit. L'EPS compte aussi.",
    icon: "moon",
    sortOrder: 5,
  },

  // Jour J
  {
    category: "jour_j",
    title: "Arrive 30 min avant",
    body: "Les épreuves commencent dès 7 h. Repère ton centre la veille.",
    icon: "alarm-clock",
    sortOrder: 1,
  },
  {
    category: "jour_j",
    title: "Convocation + pièce d'identité",
    body: "Sans elles, tu risques de ne pas entrer en salle.",
    icon: "id-card",
    sortOrder: 2,
  },
  {
    category: "jour_j",
    title: "Ton matériel",
    body: "Stylos, règle, montre. Calculatrice seulement si l'épreuve l'autorise.",
    icon: "pencil-ruler",
    sortOrder: 3,
  },
  {
    category: "jour_j",
    title: "Téléphone éteint",
    body: "La fraude est lourdement sanctionnée. Ça ne vaut jamais le coup.",
    icon: "phone-off",
    sortOrder: 4,
  },
  {
    category: "jour_j",
    title: "Ne manque aucune épreuve",
    body: "Une absence vaut 0/20, et le 0 est éliminatoire.",
    icon: "circle-alert",
    sortOrder: 5,
  },

  // Après
  {
    category: "apres",
    title: "Consulte tes résultats",
    body: "Sur bacc.digital.gov.mg, ou auprès de l'université de ta province.",
    icon: "search-check",
    sortOrder: 1,
  },
  {
    category: "apres",
    title: "Récupère ton relevé",
    body: "Il te servira pour t'inscrire dans le supérieur. Garde des copies.",
    icon: "file-check",
    sortOrder: 2,
  },
  {
    category: "apres",
    title: "Prépare ton inscription",
    body: "Relevé, acte de naissance, photos, certificat médical, fiche d'orientation.",
    icon: "folder-open",
    sortOrder: 3,
  },
  {
    category: "apres",
    title: "Choisis ta voie",
    body: "Compare les formations. Mianara t'informe, c'est toi qui décides.",
    icon: "compass",
    sortOrder: 4,
  },
];

/* ------------------------------------------------------------------ */
/* Universités (Offices du Bac)                                       */
/* ------------------------------------------------------------------ */

export const UNIVERSITIES = [
  "Antananarivo",
  "Fianarantsoa",
  "Toamasina",
  "Mahajanga",
  "Antsiranana",
  "Toliara",
] as const;

/* ------------------------------------------------------------------ */
/* FAQ                                                                */
/* ------------------------------------------------------------------ */

export type Faq = { question: string; answer: string; category: string; sortOrder: number };

export const FAQS: Faq[] = [
  {
    category: "Séries",
    question: "Les séries A, C et D existent-elles encore ?",
    answer:
      "Non. Le décret adopté le 31 août 2026 les supprime : à partir du Bac 2027, on choisit entre L, S et OSE. Des mesures de transition protègent les élèves de l'ancien système.",
    sortOrder: 1,
  },
  {
    category: "Séries",
    question: "Puis-je m'inscrire à deux séries ?",
    answer: "Non. On ne peut s'inscrire qu'à une seule série par an (décret 2021-242, art. 5).",
    sortOrder: 2,
  },
  {
    category: "Inscription",
    question: "Je suis candidat libre, où déposer mon dossier ?",
    answer:
      "Auprès de l'Office du Bac de l'université de votre province. Vous passez l'examen dans le secteur de votre résidence.",
    sortOrder: 3,
  },
  {
    category: "Inscription",
    question: "Combien coûte l'inscription ?",
    answer:
      "Session 2026 : 15 000 Ar pour un candidat d'école, 50 000 Ar pour un candidat libre, 100 000 Ar pour un candidat étranger scolarisé à Madagascar.",
    sortOrder: 4,
  },
  {
    category: "Inscription",
    question: "Et si je rate la date limite ?",
    answer:
      "Aucune dérogation n'est accordée après la clôture. Déposez votre dossier tôt et vérifiez que votre lycée l'a bien transmis.",
    sortOrder: 5,
  },
  {
    category: "Résultats",
    question: "Quelle moyenne faut-il pour être admis ?",
    answer:
      "10/20 de moyenne générale. Le jury peut abaisser ce seuil, mais jamais sous 9,50/20. Un 0 à une épreuve est éliminatoire, sauf décision du jury.",
    sortOrder: 6,
  },
  {
    category: "Résultats",
    question: "Y a-t-il une session de rattrapage ?",
    answer: "Non. Le Bac comporte une session unique par an, à la fin de l'année scolaire.",
    sortOrder: 7,
  },
  {
    category: "Résultats",
    question: "Peut-on contester une décision du jury ?",
    answer:
      "Non. Le jury est souverain et ses décisions ne peuvent faire l'objet d'aucun recours (décret 2021-242, art. 12).",
    sortOrder: 8,
  },
];

/* ------------------------------------------------------------------ */
/* Actualités                                                         */
/* ------------------------------------------------------------------ */

export type NewsItem = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  importance: NewsImportance;
  illustration: "reforme" | "calendrier" | "coefficients" | "inscription" | "sport" | "resultats";
  publishedAt: string;
  source: SourceKey;
};

export const NEWS: NewsItem[] = [
  {
    slug: "nouveaux-coefficients-terminale-2026-2027",
    title: "Nouveaux coefficients en terminale : le total passe à 30",
    excerpt: "L'anglais devient matière de base en série L, la philosophie passe à 4.",
    body: "Le ministère de l'Éducation nationale a officialisé les coefficients de terminale pour les séries L, S et OSE, applicables dès l'année scolaire 2026-2027.\n\nLe total passe de 32 à 30. Les matières de base sont à coefficient 5, les matières complémentaires de 2 à 4, les langues vivantes à 1.\n\nEn série L, l'anglais rejoint le malagasy et le français au coefficient 5. En série S, mathématiques, physique-chimie et SVT restent à 5. En série OSE, mathématiques, histoire-géographie et SES sont à 5.",
    category: "Réforme",
    importance: "high",
    illustration: "coefficients",
    publishedAt: "2026-09-18",
    source: "coefficients2027",
  },
  {
    slug: "series-a-c-d-supprimees-bac-2027",
    title: "Bac 2027 : les séries A, C et D disparaissent",
    excerpt: "Place aux séries L, S et OSE. Les inscriptions ouvriront en janvier 2027.",
    body: "Les ministères de l'Éducation nationale et de l'Enseignement supérieur ont supprimé les séries A, C et D du baccalauréat général. Dès les inscriptions au Bac 2027, les candidats choisissent entre Littéraire (L), Scientifique (S) et Organisation, Société et Économie (OSE).\n\nLes inscriptions débuteront en janvier 2027. Des mesures de transition sont prévues pour ne pas pénaliser les élèves ayant commencé leur cycle dans l'ancien système.",
    category: "Réforme",
    importance: "urgent",
    illustration: "reforme",
    publishedAt: "2026-09-10",
    source: "suppressionACD",
  },
  {
    slug: "calendrier-bac-2026",
    title: "Bac 2026 : épreuves du 17 au 21 août",
    excerpt: "Le Bac technique se poursuit du 24 au 27 août.",
    body: "Le baccalauréat général 2026 s'est déroulé du lundi 17 au vendredi 21 août, à partir de 7 heures. Pour le Bac technologique, technique et professionnel, une seconde série d'épreuves a eu lieu du 24 au 27 août.\n\nCe calendrier sert de repère pour anticiper la session 2027, dont les dates restent à publier.",
    category: "Calendrier",
    importance: "normal",
    illustration: "calendrier",
    publishedAt: "2026-01-13",
    source: "calendrier2026",
  },
  {
    slug: "cloture-inscriptions-bac-2026",
    title: "Inscriptions : clôture le 27 mars, sans dérogation",
    excerpt: "Environ 70 000 candidats attendus à l'Office d'Antananarivo.",
    body: "La date limite d'inscription au Bac 2026 était fixée au vendredi 27 mars à 18 heures. Aucune dérogation n'a été accordée pour les dossiers déposés hors délai.\n\nÀ une semaine de l'échéance, seuls 17 % des quelque 70 000 candidats attendus à l'Office d'Antananarivo avaient déposé leur dossier. Pour 2027 : déposez tôt, et vérifiez que votre établissement a bien transmis votre dossier.",
    category: "Inscription",
    importance: "normal",
    illustration: "inscription",
    publishedAt: "2026-03-19",
    source: "inscriptions2026",
  },
  {
    slug: "eps-coefficient-2",
    title: "EPS : coefficient 2 pour les séries L, S et OSE",
    excerpt: "Notée sur 40 points, l'épreuve pèse davantage dans la moyenne.",
    body: "Pour les séries L, S et OSE, l'épreuve d'éducation physique et sportive est affectée d'un coefficient 2 (notée sur 40), contre 1 dans les anciennes séries.\n\nLes candidats déclarés inaptes après un contrôle médical passent une épreuve théorique à la place.",
    category: "Épreuves",
    importance: "low",
    illustration: "sport",
    publishedAt: "2024-06-11",
    source: "eps",
  },
];
