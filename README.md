# Mianara — vitrine publique

Guide illustré du Baccalauréat malgache (séries L, S, OSE) avec un assistant IA en français et en malagasy.
C'est la première brique de la plateforme Mianara ; les espaces Candidat, École, Office du Bac et Admin
viendront se brancher sur la même base.

Menu : **Accueil · Guide · Actualités · Aide · Connexion**.

## Stack

| Besoin | Choix |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript |
| Style | Tailwind CSS 4, tokens de la charte Mianara v2 (`src/app/globals.css`), thème clair et sombre |
| Base de données | PostgreSQL (Neon ou Supabase) via Drizzle ORM + `postgres` |
| Assistant IA | API Claude (`@anthropic-ai/sdk`), réponses en streaming |
| Illustrations | SVG dessinés à la main (`src/components/illustrations/`), animations CSS |
| Icônes | Lucide (charte v2) |
| Polices | Plus Jakarta Sans, JetBrains Mono (fichiers de la charte, servis localement) |

## Démarrer

```bash
pnpm install
cp .env.example .env      # puis renseignez DATABASE_URL et ANTHROPIC_API_KEY
pnpm db:push              # crée les tables
pnpm db:seed              # charge les données du Bac
pnpm dev
```

Sans `DATABASE_URL`, le site tourne avec les données de `src/content/bac.ts` : pratique pour travailler
sur le design sans base. Sans `ANTHROPIC_API_KEY`, l'assistant affiche « pas encore configuré ».

### Neon

Créez un projet sur <https://console.neon.tech>, copiez la chaîne de connexion dans `DATABASE_URL`.

### Supabase

Project Settings → Database → Connection string (URI). Le pooler en mode transaction fonctionne :
le client est configuré avec `prepare: false`.

## Données

Toutes les informations du guide viennent de `src/content/bac.ts`, qui sert de jeu initial pour la base
(`src/db/seed.ts`). Chaque information a une source (table `sources`) ; celles qui ne sont pas confirmées
par un texte officiel portent `is_confirmed = false` et s'affichent avec un badge « À confirmer ».

Points à faire valider par l'Office du Bac :

- répartition exacte des « autres disciplines » (philosophie, EPS…) dans le total de 30 coefficients ;
- liste des pièces du dossier d'inscription ;
- dates du Bac 2027 (non publiées au 26/09/2026) ;
- formulations malagasy de l'interface (`src/lib/i18n.ts`), à relire par un locuteur natif.

Pour publier une actualité : insérez une ligne dans `news` avec `published_at` renseigné.

## Structure

```
src/
  app/                 pages (accueil, guide/*, actualites, aide, connexion) et api/assistant
  components/
    illustrations/     scène d'accueil, élèves, ravinala, petites illustrations
    assistant/         conversation, widget flottant
    layout/            en-tête, pied de page, choix de langue
  content/bac.ts       données de référence du Bac
  db/                  schéma Drizzle, client, script de chargement
  lib/                 accès aux données, prompt de l'assistant, textes FR/MG
drizzle/               migrations SQL générées
```

## Assistant IA

`POST /api/assistant` : valide la conversation (20 messages max), construit un prompt à partir des
données en base, puis appelle Claude en streaming. Le modèle se règle avec `ANTHROPIC_MODEL`
(par défaut `claude-opus-5`, effort bas pour des réponses rapides). Si le modèle décline une question,
l'API la relance sur le modèle de repli recommandé (`fallbacks: "default"`). Une limite simple de
20 questions / 10 min / IP protège la clé.

L'assistant n'a accès à aucun dossier personnel : il renvoie vers le lycée ou l'Office du Bac.

## Suite

Phase 2 : authentification et espaces Candidat, École, Office du Bac, Admin (cahier des charges
BacConnect), sur les mêmes tables (`series`, `subjects`, `serie_subjects`, `exam_sessions`, `news`).
