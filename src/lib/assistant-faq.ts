import "server-only";
import { RULES } from "@/content/bac";
import type { BacData } from "./data";

/**
 * Réponse de secours, sans IA : on cherche dans les données du Bacc (FAQ,
 * frais, calendrier, dossier, séries) la fiche la plus proche de la question.
 * Sert quand aucun fournisseur d'IA n'est configuré ou qu'il est indisponible
 * (quota gratuit épuisé, panne) : l'élève obtient une réponse officielle au
 * lieu d'une erreur.
 */

type Doc = {
  title: string;
  body: string;
  keywords: string;
  /** Série décrite par la fiche (bonus quand la question la cite). */
  serie?: string;
  /** Tournure de question qui désigne cette fiche (« quand… » → calendrier). */
  intent?: RegExp;
};

const STOPWORDS = new Set(
  // Français
  (
    "a au aux avec ce ces c cet cette d dans de des du elle en est et être il ils j je l la le les leur " +
    "lui m ma mais me mes moi mon n ne nos notre nous on ou où par pas pour qu que quel quelle quels " +
    "quelles qui s sa se ses si son sont sur t ta te tes toi ton tu un une vos votre vous y comment " +
    "combien quand quoi est-ce faut faire peut peux dois doit bonjour salut merci svp bacc bac " +
    // Malagasy (mots-outils courants)
    "ny sy ary ho amin an i dia fa na ve inona ahoana aiza rahoviana firy izay ity io izao aho ianao " +
    "izy isika izahay azafady misaotra salama"
  ).split(/\s+/),
);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ");
}

/**
 * Mots utiles, sans marque du pluriel et réduits à leurs 6 premières lettres
 * (racine grossière : « inscrire » ≈ « inscription », « séries » ≈ « série »).
 */
function terms(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map((w) => (w.length > 3 ? w.replace(/[sx]$/, "") : w).slice(0, 6));
}

function buildDocs(data: BacData): Doc[] {
  const flag = (confirmed: boolean) => (confirmed ? "" : " (à confirmer)");
  const docs: Doc[] = data.faqs.map((f) => ({
    title: f.question,
    body: f.answer,
    keywords: `${f.question} ${f.category}`,
  }));

  if (data.fees.length) {
    docs.push({
      title: "Frais d'inscription au Bacc",
      body: data.fees
        .map(
          (f) => `- ${f.label} : **${f.amountAriary.toLocaleString("fr-FR")} Ar** (session ${f.sessionYear})`,
        )
        .join("\n"),
      keywords: "frais inscription prix montant payer ariary droits coût coûte coûtent",
      intent: /(?<!\p{L})(combien|co[uû]t\p{L}*|prix|payer|frais|ohatrinona|vidiny|sarany)(?!\p{L})/iu,
    });
  }
  if (data.calendar.length) {
    docs.push({
      title: "Calendrier du Bacc",
      body: data.calendar.map((c) => `- **${c.dateLabel}** : ${c.title}${flag(c.confirmed)}`).join("\n"),
      keywords: "date calendrier quand examen épreuves inscription résultats session daty",
      intent: /\b(quand|dates?|daty|rahoviana|calendrier|jour|mois)\b/i,
    });
  }
  if (data.dossier.length) {
    docs.push({
      title: "Dossier d'inscription",
      body:
        data.dossier
          .map((d) => `- [${d.candidateType}] ${d.label} : ${d.detail}${flag(d.confirmed)}`)
          .join("\n") + "\n\nListe indicative : vérifie-la auprès de ton établissement.",
      keywords:
        "dossier pièces documents papiers inscription inscrire fournir candidat libre antontan taratasy",
    });
  }
  docs.push({
    title: "Admission et mentions",
    body: [
      `- Admis avec une moyenne générale d'au moins **${RULES.admissionAverage}/20**. Le jury peut abaisser ce seuil, jamais sous ${RULES.juryFloor.toFixed(2).replace(".", ",")}/20.`,
      ...RULES.mentions.map((m) => `- **${m.label}** : de ${m.min} à moins de ${m.max}/20`),
      "- Un 0 à une épreuve est éliminatoire, sauf décision du jury.",
    ].join("\n"),
    keywords: "mention moyenne admis admission note passable assez bien tres bien seuil jury",
  });

  for (const s of data.series) {
    const coefs = data.coefficients
      .filter((c) => c.serieCode === s.code)
      .map((c) => `- ${c.subjectName} : coefficient ${c.coefficient}${flag(c.confirmed)}`)
      .join("\n");
    docs.push({
      serie: s.code,
      title: `Série ${s.code} — ${s.name}`,
      body: `${s.description}\n\nCoefficients en terminale :\n${coefs}\n\nDébouchés : ${s.careers.join(", ")}.`,
      keywords: `serie ${s.code} ${s.code} ${s.name} ${s.formerOptions} coefficient matieres debouches andiany`,
    });
  }
  return docs;
}

/** Séries supprimées par la réforme : une question sur elles doit tomber sur la fiche qui l'explique. */
const FORMER_SERIES = ["A", "C", "D"];

/** Codes cités tels quels (« S », « OSE ») ou après « série » (« série s ») ; « C'est » ne compte pas. */
function seriesIn(question: string, codes: string[]): Set<string> {
  const found = new Set<string>();
  for (const code of codes) {
    const named = new RegExp(String.raw`s[ée]ries?\s+${code}(?![\p{L}'’])`, "iu");
    const alone = new RegExp(String.raw`(?<![\p{L}])${code}(?![\p{L}'’])`, "u");
    if (named.test(question) || alone.test(question)) found.add(code);
  }
  return found;
}

/** Le code apparaît-il comme un mot isolé dans le titre ? (« Les séries A, C et D… ») */
const titleCites = (title: string, code: string) =>
  new RegExp(String.raw`(?<![\p{L}])${code}(?![\p{L}'’])`, "u").test(title);

function score(query: string[], question: string, series: Set<string>, doc: Doc): number {
  const title = new Set(terms(`${doc.title} ${doc.keywords}`));
  const body = new Set(terms(doc.body));
  let total = 0;
  for (const q of new Set(query)) {
    if (title.has(q)) total += 3;
    else if (body.has(q)) total += 1;
  }
  if (doc.intent?.test(question)) total += 6;
  if (doc.serie && series.has(doc.serie)) total += 5;
  if (!doc.serie && FORMER_SERIES.some((c) => series.has(c) && titleCites(doc.title, c))) total += 5;
  return total;
}

const TEXT = {
  fr: {
    intro: "Voici ce que j'ai trouvé dans nos fiches :",
    related: "Questions proches :",
    none: "Je n'ai pas trouvé de réponse précise à cette question. Essaie de la reformuler avec des mots-clés (par exemple « frais d'inscription », « coefficients série S », « date des résultats »), ou consulte la FAQ de la page Aide. Pour ton dossier personnel, adresse-toi à ton établissement ou à l'Office du Bacc de ton université.",
  },
  mg: {
    intro: "Ity no hitako tao amin'ny fanazavana ananantsika (amin'ny teny frantsay) :",
    related: "Fanontaniana mifandraika :",
    none: "Tsy nahita valiny mazava amin'io fanontaniana io aho. Andramo averina amin'ny teny fototra (ohatra « frais d'inscription », « coefficient série S », « date des résultats »), na jereo ny FAQ ao amin'ny pejy Fanampiana. Ho an'ny antontan-taratasinao manokana, manatona ny sekolinao na ny Office du Bacc.",
  },
};

export function answerFromFaq(question: string, data: BacData, lang: "fr" | "mg"): string {
  const t = TEXT[lang];
  const query = terms(question);
  const series = seriesIn(question, [...data.series.map((s) => s.code), ...FORMER_SERIES]);
  const ranked = buildDocs(data)
    .map((doc) => ({ doc, score: score(query, question, series, doc) }))
    .filter((r) => r.score >= 3)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return t.none;

  const [best, ...rest] = ranked;
  const related = rest
    .filter((r) => r.score >= best.score / 2)
    .slice(0, 2)
    .map((r) => `- ${r.doc.title}`);

  return [
    t.intro,
    `**${best.doc.title}**`,
    best.doc.body,
    ...(related.length ? [`${t.related}\n${related.join("\n")}`] : []),
  ].join("\n\n");
}
