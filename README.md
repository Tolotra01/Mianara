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

## API mobile Flutter

Ces routes App Router sont des API JSON réservées aux comptes candidats. Le client mobile ne reçoit
ni secret de base de données (`DATABASE_URL`), ni clé Anthropic (`ANTHROPIC_API_KEY`) : les appels
PostgreSQL et Claude restent exclusivement côté serveur. Toutes les réponses API sont `no-store`.

### Connexion

`POST /api/mobile/auth/login`

```json
{ "identifiant": "BAC2027-S-00042", "password": "mot-de-passe" }
```

`identifiant` accepte le matricule ou le username candidat. Réussite (`200`) :

```json
{
  "token": "<jeton aléatoire à conserver côté mobile>",
  "mustChangePassword": true,
  "candidate": {
    "id": "<uuid candidat>",
    "matricule": "BAC2027-S-00042",
    "firstName": "…",
    "lastName": "…",
    "serieCode": "S"
  }
}
```

Le serveur ne pose pas de cookie. Seul `sha256(token)` est stocké dans `auth_sessions`, avec une
expiration à 7 jours. Les identifiants invalides (dont un compte verrouillé) renvoient le même
`401`; après 5 échecs le compte est verrouillé 15 minutes conformément à la connexion web. Les
tentatives sont également limitées par adresse IP sur chaque instance.
Entrée invalide : `400`; compte désactivé : `403`; corps trop volumineux : `413`; débit dépassé :
`429`; indisponibilité serveur : `503`.

Quand `mustChangePassword` est `true`, Flutter doit demander le changement avant d'autoriser la
synchronisation. Le jeton renvoyé est déjà une session valide, mais l'API sync la refuse tant que le
changement n'est pas effectué.

### Changement du mot de passe initial

`POST /api/mobile/auth/change-password` avec le même jeton de connexion envoyé en authentification HTTP.

```json
{ "currentPassword": "mot-de-passe-temporaire", "newPassword": "NouveauMotDePasse2" }
```

La validation suit la politique web existante (8 caractères minimum, au moins une lettre et un
chiffre, différent du mot de passe actuel). Le succès est `{ "changed": true }`. Le serveur vérifie
le mot de passe actuel, bcrypt-hache le nouveau, efface le secret temporaire imprimé et consigne
`compte.changer_mot_de_passe` dans l'audit. La session existante est conservée, ni remplacée ni révoquée ; Flutter peut poursuivre avec le même jeton après le succès. Erreurs : `400` entrée/politique invalide,
`401` session invalide ou mot de passe actuel incorrect, `413` corps trop volumineux, `503`
indisponibilité.

### Déconnexion

`POST /api/mobile/auth/logout` : envoyer le token du login dans l'en-tête HTTP Authorization de type
Bearer. Le serveur supprime la session correspondante de `auth_sessions` et renvoie
`{ "loggedOut": true }`. L'opération est idempotente pour un token valide au format attendu, même si
sa session a déjà expiré ou été supprimée ; un jeton absent ou mal formé renvoie `401`.

### Synchronisation des révisions

`POST /api/mobile/sync` requiert le jeton de connexion dans l'en-tête d'authentification HTTP au format Bearer.

```json
{
  "revisions": [{
    "id": "2d257c3d-0847-4bb9-9da2-f478c55316f0",
    "subject": "MATH",
    "startedAt": "2026-09-26T11:00:00.000Z",
    "endedAt": "2026-09-26T11:45:00.000Z",
    "progress": 75
  }]
}
```

Un lot comprend 0 à 100 sessions (un lot vide permet de récupérer le profil candidat seul). Chaque
`id` UUID doit être stable et unique. `subject` est le code de matière (`subjects.code`) et doit
appartenir à la série du candidat. Une répétition est idempotente : la première écriture est
conservée et l'API renvoie l'identifiant déjà enregistré uniquement s'il appartient au candidat
connecté. Les dates doivent être cohérentes (durée maximale 24 h, pas plus de 5 minutes dans le futur
ni de 5 ans dans le passé), `progress` est compris entre 0 et 100. Champs inconnus, notamment les
champs officiels ou un identifiant candidat fourni par le client, sont rejetés. Les écritures sont
limitées au candidat dérivé de la session.

Le débit de synchronisation est plafonné à 120 requêtes / 10 min / IP et 60 / 10 min / candidat
sur chaque instance.

Succès (`200`) :

```json
{
  "candidate": {
    "id": "<uuid candidat>",
    "matricule": "BAC2027-S-00042",
    "firstName": "…",
    "lastName": "…",
    "serieCode": "S"
  },
  "subjects": [
    { "code": "MATH", "name": "Mathématiques", "nameMg": "Matematika", "coefficient": 5 }
  ],
  "acceptedIds": ["2d257c3d-0847-4bb9-9da2-f478c55316f0"]
}
```

Le profil renvoyé est limité à `id`, matricule, prénom, nom et code de série ; date/lieu de naissance,
coordonnées, notes, résultats et autres données du dossier ne sont pas exposés. `acceptedIds` contient
les UUID effectivement associés au candidat connecté, y compris les répétitions idempotentes. `subjects`
contient le catalogue officiel de la série (`code`, `name`, `nameMg`, `coefficient`) : Flutter doit
utiliser `subjects[].code` dans les révisions et non des libellés codés en dur. Les révisions sont
stockées dans `mobile_revision_sessions` (migration manuelle
`drizzle/0004_mobile_revision_sessions.sql`) ; appliquer cette migration avant d'utiliser la route,
sans `db:push`.

Réponses d'erreur : `400` lot invalide, `401` jeton invalide/expiré, `403` compte indisponible ou mot
de passe à changer, `413` corps trop volumineux, `422` matière hors série, `429` débit dépassé,
`503` indisponibilité.

### Enseignants et apprentissage

Les enseignants s'inscrivent gratuitement à `/enseignant/inscription`, choisissent leur matière et
peuvent se connecter immédiatement. Depuis `/enseignant`, ils déposent séparément un justificatif
d'identité et de qualification (PDF/JPEG/PNG, 3 Mo maximum), puis soumettent des cours, formations ou
offres de coaching. Les pièces sont conservées dans `teacher_documents` (bytea), ne sont jamais
publiques et leur téléchargement exige un compte admin. Le statut vérifié nécessite l'approbation des
deux pièces. Chaque offre passe aussi par une décision admin indépendante. Seul le coaching peut être
payant ; le prix final en MGA est confirmé à l'approbation de l'offre par l'admin. L'administration
peut consulter ces files dans `/admin/apprentissage`.

Routes candidat (Bearer token, réponses `no-store`) :

- `GET /api/mobile/learning` : offres approuvées des enseignants vérifiés, limitées à la série du
  candidat. Pour une offre payante non achetée, `content` ne contient que la description. Le champ
  `currency` vaut toujours `MGA`; `payment.merchantNumber` indique le numéro marchand Orange Money
  configuré par l'Administration ou `null` s'il n'est pas encore renseigné. Le candidat ne peut pas
  soumettre une référence depuis l'application si ce numéro n'est pas configuré.
- `POST /api/mobile/coaching/payments` : JSON strict `{ "listingId": "<uuid>", "transactionReference": "..." }`.
  Le prix, l'enseignant et la série sont lus depuis l'offre vérifiée/approuvée côté serveur. Une
  référence Orange Money unique est soumise à l'admin ; aucun montant ou identifiant de partie envoyé
  par le client n'est accepté.
- `GET /api/mobile/coaching/sessions` : les demandes en attente et conversations ouvertes du candidat,
  sans nom ni identifiant d'enseignant/candidat.
- `GET|POST /api/mobile/coaching/sessions/<uuid>/messages` : lecture et envoi de `{ "text": "..." }`.
  Ces routes exigent une session active et un paiement approuvé ; seules les étiquettes anonymes
  `teacher` et `candidate` sont rendues. L'espace enseignant affiche la série du candidat mais jamais
  son nom ou matricule.

Les nouvelles tables et le rôle `teacher` sont définis dans la migration additive
`drizzle/0005_learning_marketplace.sql`. Appliquer cette migration manuellement pendant une fenêtre
de déploiement avant de publier le code ; ne pas utiliser `db:push`. Elle n'a pas été appliquée par
ce changement. Le numéro marchand administrable est ajouté par
`drizzle/0006_coaching_payment_settings.sql`, à appliquer après `0005` avant le déploiement.

## Gestion du Bac (phase 2)

Le dépôt et le contrôle des dossiers restent manuels (élève → lycée → Office du Bac). La plateforme
prend le relais quand l'Office enregistre un candidat validé.

| Espace | Accès | Rôle |
| --- | --- | --- |
| École | `/ecole` | Dossiers des élèves (identité, adresse, photo, pièces), envoi par lots à l'Office, suivi (envoyé, incomplet à corriger, non validé, validé), convocations de ses candidats (téléchargement groupé), propositions d'actualités |
| Office du Bac | `/office` | Traitement des dossiers des écoles (validation groupée, renvoi incomplet, refus), candidats libres, écoles de l'Office, enregistrement des candidats (matricule, identifiants, QR signé et convocation PDF générés d'un coup), centres et salles, surveillants, emploi du temps, épreuves en direct, notes, délibération, publication, demandes de relevé et de diplôme, liste noire |
| Candidat | `/candidat` | Parcours, convocation, épreuves et présence, résultats, demandes (paiement Mobile Money ou virement, ticket), notifications |
| Surveillant | `/surveillant` | Ses salles et la liste des candidats. Le scan se fera avec l'application mobile |
| Administration | `/admin` | Vue nationale agrégée, Offices et agents, visite de l'espace d'un Office (consultation), écoles et leurs comptes, candidats libres, paramètres de session, actualités (et validation des propositions), journal d'audit |
| Public | `/resultats` | Recherche d'un résultat par matricule, ou nom + prénom + date de naissance |

### Démarrer la démonstration

```bash
pnpm db:push          # tables (vitrine + gestion)
pnpm db:seed          # référentiel du Bac
pnpm db:seed:demo     # Offices, comptes, centres, emploi du temps 2027, 12 candidats
pnpm db:reset-demo    # remet la gestion à zéro et recharge la démonstration
```

Comptes (mot de passe `DEMO_PASSWORD`, par défaut `Mianara2027!`) : `admin`, `office.tana`,
`surveillant.tana1`, `surveillant.tana2`, et les écoles `ecole.andohalo`, `ecole.rabearivelo`,
`ecole.alarobia` (lycée technique). Les identifiants des candidats sont imprimés
par le script et figurent sur leur convocation (espace Office → fiche du candidat).

### Règles appliquées

- Matricule `BAC{année}-{série}-{00001}` ; mot de passe temporaire à changer à la 1re connexion ;
  verrouillage 15 min après 5 échecs.
- QR de convocation : lisible par n'importe quel lecteur (nom, prénom, adresse, école, session,
  série, matricule), suivi d'un jeton signé Ed25519 dérivé de `APP_SECRET` que vérifie l'application
  de scan. Changer ce secret invalide les QR imprimés. Convocation au format A5.
- Séries : Bac général (L, S, OSE) et Bac technique (TI industriel, TGC génie civil, TT tertiaire,
  TA agricole, secteurs du METFP ; coefficients provisoires à confirmer). L'EPS (coefficient 2) a son
  épreuve théorique dans l'emploi du temps.
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
