# Mianara

Plateforme du Baccalauréat malgache : une vitrine publique (guide illustré, actualités, assistant IA en
français et en malagasy) et la gestion du Bac (Office du Bac, candidats, surveillants, administration).

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

## Gestion du Bac (phase 2)

Le dépôt et le contrôle des dossiers restent manuels (élève → lycée → Office du Bac). La plateforme
prend le relais quand l'Office enregistre un candidat validé.

| Espace | Accès | Rôle |
| --- | --- | --- |
| Office du Bac | `/office` | Enregistrement des candidats (matricule, identifiants, QR signé et convocation PDF générés d'un coup), centres et salles, surveillants, emploi du temps, épreuves en direct, notes, délibération, publication, demandes de relevé et de diplôme, liste noire |
| Candidat | `/candidat` | Parcours, convocation, épreuves et présence, résultats, demandes (paiement Mobile Money ou virement, ticket), notifications |
| Surveillant | `/surveillant` | Ses salles et la liste des candidats. Le scan se fera avec l'application mobile |
| Administration | `/admin` | Vue nationale agrégée, Offices et agents, paramètres de session, actualités de la vitrine, journal d'audit |
| Public | `/resultats` | Recherche d'un résultat par matricule, ou nom + prénom + date de naissance |

### Démarrer la démonstration

```bash
pnpm db:push          # tables (vitrine + gestion)
pnpm db:seed          # référentiel du Bac
pnpm db:seed:demo     # Offices, comptes, centres, emploi du temps 2027, 12 candidats
pnpm db:reset-demo    # remet la gestion à zéro et recharge la démonstration
```

Comptes du personnel (mot de passe `DEMO_PASSWORD`, par défaut `Mianara2027!`) : `admin`,
`office.tana`, `surveillant.tana1`, `surveillant.tana2`. Les identifiants des candidats sont imprimés
par le script et figurent sur leur convocation (espace Office → fiche du candidat).

### Règles appliquées

- Matricule `BAC{année}-{série}-{00001}` ; mot de passe temporaire à changer à la 1re connexion ;
  verrouillage 15 min après 5 échecs.
- QR de convocation : jeton signé Ed25519 (identifiant + signature, aucune donnée personnelle),
  dérivé de `APP_SECRET`. Changer ce secret invalide les QR imprimés.
- Scans (RG-05 à RG-07) : entrée de −30 min jusqu'à l'heure exacte du début, fin d'épreuve jusqu'à
  +30 min, pas de fin d'épreuve sans entrée, anti-double scan. La logique est dans
  `src/lib/bac-rules.ts` et `src/lib/services/scan.ts`, prête pour l'API de l'application mobile.
- Délibération : moyenne pondérée, note manquante = 0, 0 éliminatoire, seuil du jury (10 par défaut,
  jamais sous 9,50), mentions, fraude constatée → « Fraude ». Notes invisibles avant publication et
  verrouillées après ; seule l'Admin peut annuler une publication.
- Demandes : relevé à J+n après publication (admis seulement), diplôme après retrait du relevé, une
  demande par document, référence de paiement unique, liste noire bloquante. Documents papier remis
  au guichet après contrôle d'identité.
- Chaque écriture est tracée dans `audit_logs`. Les SMS et emails sont simulés (journaux du serveur)
  en attendant un fournisseur.

Tests des règles : `pnpm test`.

### Limites connues

- Photos et reçus sont stockés en base (`bytea`). En production, prévoir un stockage objet
  (Supabase Storage, Cloudflare R2).
- Le contrôle d'accès est fait dans le code serveur (rôle + Office sur chaque requête), pas encore
  par Row Level Security PostgreSQL.
- Les tarifs du relevé et du diplôme (10 000 / 20 000 Ar) sont des valeurs de départ à confirmer.

## Suite

Phase 3 : application mobile de scan (entrée, sorties, fin d'épreuve, fraude, remise au guichet),
hors ligne avec synchronisation, branchée sur `src/lib/services/scan.ts`.
