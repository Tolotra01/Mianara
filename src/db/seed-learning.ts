/**
 * Apprentissage de démonstration : enseignants, cours et exercices validés,
 * offre de tutorat, un contenu en attente de validation et le numéro marchand.
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { subjects } from "./schema";
import { users } from "./schema-gestion";
import { learningItems, platformSettings, teachers } from "./schema-learning";
import type { Tx } from "../lib/audit";

const DERIVEES = `# Dérivées : règles de calcul

## Formules de base
- (xⁿ)' = n·xⁿ⁻¹ (n entier non nul)
- (√x)' = 1 / (2√x), pour x > 0
- (1/x)' = −1/x², pour x ≠ 0
- (eˣ)' = eˣ et (ln x)' = 1/x, pour x > 0

## Opérations
- (u + v)' = u' + v'
- (k·u)' = k·u'
- (u·v)' = u'·v + u·v'
- (u/v)' = (u'·v − u·v') / v², là où v ≠ 0
- (u∘v)' = (u'∘v) × v'   ; par exemple (eᵘ)' = u'·eᵘ

## Sens de variation
Sur un intervalle I :
- si f'(x) > 0 sur I (sauf en des points isolés), f est **strictement croissante** sur I ;
- si f'(x) < 0, f est **strictement décroissante** ;
- un extremum local en a (intérieur à I) impose f'(a) = 0, et f' change de signe en a.

## Exemple guidé
f(x) = x³ − 3x + 1 sur ℝ.
1. f'(x) = 3x² − 3 = 3(x − 1)(x + 1).
2. f'(x) < 0 sur ]−1 ; 1[, f'(x) > 0 sur ]−∞ ; −1[ et ]1 ; +∞[.
3. Maximum local f(−1) = 3, minimum local f(1) = −1.

**Méthode au Bac** : dérivée → factorisation → tableau de signes → tableau de variations → valeurs aux bornes.`;

const SUITES = `# Suites numériques : exercices corrigés

## Exercice 1
(uₙ) est arithmétique, u₀ = 3 et r = 4. Calculer u₁₀ et S = u₀ + … + u₁₀.

**Corrigé** : uₙ = u₀ + n·r, donc u₁₀ = 3 + 40 = 43.
S = (nombre de termes) × (premier + dernier) / 2 = 11 × (3 + 43) / 2 = 253.

## Exercice 2
(vₙ) est géométrique, v₀ = 2 et q = 3. Calculer v₅ et v₀ + … + v₄.

**Corrigé** : vₙ = v₀·qⁿ, donc v₅ = 2 × 243 = 486.
v₀ + … + v₄ = v₀ × (1 − q⁵) / (1 − q) = 2 × (1 − 243) / (1 − 3) = 242.

## Exercice 3
uₙ₊₁ = 0,5·uₙ + 4 et u₀ = 2. On pose wₙ = uₙ − 8.
1. Montrer que (wₙ) est géométrique.
2. En déduire uₙ et sa limite.

**Corrigé** :
1. wₙ₊₁ = uₙ₊₁ − 8 = 0,5·uₙ − 4 = 0,5·(uₙ − 8) = 0,5·wₙ : raison 0,5, w₀ = −6.
2. wₙ = −6 × 0,5ⁿ, donc uₙ = 8 − 6 × 0,5ⁿ. Comme 0 < 0,5 < 1, 0,5ⁿ → 0 : uₙ → 8.

## Exercice 4
Montrer par récurrence que pour tout n ≥ 0 : 1 + 2 + … + n = n(n + 1)/2.

**Corrigé** : vraie pour n = 0 (0 = 0). Si elle est vraie au rang n, alors
1 + … + n + (n + 1) = n(n + 1)/2 + (n + 1) = (n + 1)(n + 2)/2 : vraie au rang n + 1.

## Exercice 5
La suite uₙ = (2n + 1)/(n + 3) est-elle croissante ?

**Corrigé** : uₙ = 2 − 5/(n + 3). Quand n augmente, 5/(n + 3) diminue, donc uₙ augmente : la suite est croissante et tend vers 2.`;

const DISSERTATION = `# La dissertation littéraire en 5 étapes

## 1. Analyser le sujet (15 min)
- Souligner les mots-clés et les définir.
- Repérer la thèse proposée et reformuler la question : c'est la **problématique**.

## 2. Chercher les idées et les exemples
- Deux ou trois arguments par partie.
- Un exemple précis par argument : œuvre, auteur, passage.

## 3. Construire le plan
- Plan dialectique : thèse / antithèse / synthèse.
- Plan thématique : plusieurs aspects d'une même idée.
- Chaque partie annonce son idée directrice dès la première phrase.

## 4. Rédiger l'introduction et la conclusion au brouillon
- Introduction : amorce, sujet cité, problématique, annonce du plan.
- Conclusion : bilan de la réponse, puis ouverture.

## 5. Rédiger et relire (15 min de relecture)
- Une idée par paragraphe : argument → exemple → analyse.
- Transitions entre les parties.
- Relire l'orthographe, les accords et la ponctuation.

**Barème courant** : compréhension du sujet, qualité de l'argumentation, pertinence des exemples, expression.`;

const PHILO = `# Philosophie : réussir l'introduction

L'introduction compte beaucoup : le correcteur y juge si vous avez compris le sujet.

## Les quatre temps
1. **Accroche** : une situation concrète ou un paradoxe lié au sujet (pas de citation plaquée).
2. **Définitions** des notions du sujet (par exemple : liberté, bonheur, vérité).
3. **Problème** : montrer que la réponse n'est pas évidente, en opposant deux réponses possibles.
4. **Annonce du plan**, sous forme de questions.

## Exemple : « Peut-on être libre sans lois ? »
- Accroche : on associe souvent la liberté à l'absence de contrainte.
- Définitions : liberté (pouvoir d'agir selon sa volonté), loi (règle commune).
- Problème : la loi semble limiter la liberté ; mais sans loi, le plus fort domine.
- Plan : I. La loi comme contrainte ; II. La loi comme condition de la liberté ; III. La loi que l'on se donne à soi-même.`;

export async function seedLearning(tx: Tx, hash: string) {
  const codes = ["MATH", "FRA", "PHI"];
  const subs = await tx.select().from(subjects).where(inArray(subjects.code, codes));
  const id = (code: string) => subs.find((s) => s.code === code)!.id;

  const people = [
    { username: "prof.maths", fullName: "Haingo Rakotomanga", subject: "MATH" },
    { username: "prof.francais", fullName: "Lalao Ravao", subject: "FRA" },
    { username: "prof.philo", fullName: "Mamitiana Randria", subject: "PHI" },
  ];
  const account = new Map<string, string>();
  for (const p of people) {
    const [u] = await tx
      .insert(users)
      .values({
        role: "teacher",
        username: p.username,
        fullName: p.fullName,
        passwordHash: hash,
        mustChangePassword: false,
      })
      .returning({ id: users.id });
    await tx.insert(teachers).values({ userId: u.id, subjectId: id(p.subject) });
    account.set(p.username, u.id);
  }
  const [admin] = await tx.select({ id: users.id }).from(users).where(eq(users.username, "admin"));
  const now = new Date();
  const published = { status: "approved" as const, reviewedBy: admin?.id ?? null, reviewedAt: now };

  await tx.insert(learningItems).values([
    {
      kind: "course",
      subjectId: id("MATH"),
      authorId: account.get("prof.maths")!,
      title: "Dérivées : règles de calcul et variations",
      description:
        "Les formules à connaître, le lien entre signe de la dérivée et variations, un exemple type Bac.",
      content: DERIVEES,
      durationMinutes: 25,
      ...published,
    },
    {
      kind: "training",
      subjectId: id("MATH"),
      authorId: account.get("prof.maths")!,
      title: "Suites numériques : 5 exercices corrigés",
      description: "Suites arithmétiques et géométriques, suite auxiliaire, récurrence, sens de variation.",
      content: SUITES,
      priceAmount: 2000,
      durationMinutes: 45,
      ...published,
    },
    {
      kind: "coaching",
      subjectId: id("MATH"),
      authorId: account.get("prof.maths")!,
      title: "Tutorat de mathématiques · 1 heure",
      description:
        "Une heure d'échange écrit avec un professeur de mathématiques pour débloquer un chapitre ou un sujet d'annales.",
      priceAmount: 5000,
      durationMinutes: 60,
      ...published,
    },
    {
      kind: "course",
      subjectId: id("FRA"),
      authorId: account.get("prof.francais")!,
      title: "La dissertation littéraire en 5 étapes",
      description: "De l'analyse du sujet à la relecture : la méthode et le barème.",
      content: DISSERTATION,
      durationMinutes: 20,
      ...published,
    },
    {
      kind: "course",
      subjectId: id("PHI"),
      authorId: account.get("prof.philo")!,
      title: "Philosophie : réussir l'introduction",
      description: "Accroche, définitions, problème, annonce du plan, avec un exemple rédigé.",
      content: PHILO,
      priceAmount: 1000,
      durationMinutes: 15,
      ...published,
    },
    {
      kind: "training",
      subjectId: id("MATH"),
      authorId: account.get("prof.maths")!,
      title: "Probabilités conditionnelles : arbres pondérés",
      description: "Construire un arbre, formule des probabilités totales, exercices type Bac.",
      content:
        "# Probabilités conditionnelles\n\nP_A(B) = P(A ∩ B) / P(A), pour P(A) ≠ 0.\n\n**Probabilités totales** : si A et Ā partitionnent l'univers, P(B) = P(A)·P_A(B) + P(Ā)·P_Ā(B).",
      priceAmount: 1500,
      durationMinutes: 30,
      status: "submitted",
    },
  ]);

  await tx
    .insert(platformSettings)
    .values({ key: "orange_money_merchant", value: "0321234567", updatedBy: admin?.id ?? null })
    .onConflictDoUpdate({ target: platformSettings.key, set: { value: "0321234567" } });
}

/** `pnpm db:seed:learning` : ajoute l'apprentissage de démonstration sans toucher au reste. */
async function standalone() {
  const { requireDb } = await import("./index");
  const { hashPassword } = await import("../lib/password");
  const db = requireDb();
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.username, "prof.maths"));
  if (exists) {
    console.log("Apprentissage de démonstration déjà présent (prof.maths existe).");
  } else {
    const hash = await hashPassword(process.env.DEMO_PASSWORD || "Mianara2027!");
    await db.transaction((tx) => seedLearning(tx, hash));
    console.log("✓ Enseignants prof.maths, prof.francais, prof.philo et contenus ajoutés.");
  }
  process.exit(0);
}

if (process.argv[1]?.endsWith("seed-learning.ts")) {
  standalone().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
