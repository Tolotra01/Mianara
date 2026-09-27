import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import * as vitrine from "./schema";
import * as gestion from "./schema-gestion";

const schema = { ...vitrine, ...gestion };

const url = process.env.DATABASE_URL;

/**
 * Échecs survenus avant que la requête ne parte (connexion refusée, délai de
 * connexion dépassé, DNS) : la rejouer est sans risque, même pour une écriture.
 * Depuis un réseau lent ou instable, une connexion sur une dizaine dépasse les
 * 10 s d'attente de Node (« fetch failed ») ; sans nouvelle tentative, une
 * seule requête ratée fait tomber toute la page.
 */
const CONNECT_ERRORS = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ENETUNREACH",
]);

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      const code = (err as { cause?: { code?: string } }).cause?.code;
      if (attempt >= 3 || !code || !CONNECT_ERRORS.has(code)) throw err;
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Base de données : connexion ratée (${code}), nouvelle tentative ${attempt}/2.`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
};

/**
 * `null` quand DATABASE_URL n'est pas défini : les données viennent alors de src/content/bac.ts.
 *
 * Transport HTTP et non `postgres` : ce dernier ouvre une connexion TCP sur le
 * port 5432, injoignable depuis ce réseau — la connexion expirait au premier
 * `select`. Chaque requête part donc en HTTPS sur le port 443, sans connexion
 * à maintenir ni pool côté client ; `getBacData()` les lance déjà en parallèle.
 *
 * Le seed, lui, a besoin d'une transaction interactive : il utilise le pilote
 * WebSocket (`drizzle-orm/neon-serverless`), qui refuse de s'ouvrir par HTTP.
 */
export const db = url ? drizzle(neon(url), { schema }) : null;

export type Db = NonNullable<typeof db>;

/** La gestion (comptes, candidats, épreuves…) n'a pas de repli : la base est obligatoire. */
export function requireDb(): Db {
  if (!db) throw new Error("DATABASE_URL manquant : la gestion du Bacc nécessite une base PostgreSQL.");
  return db;
}

/**
 * Client transactionnel, pour les actions dont l'enchaînement doit être atomique
 * (convoquer un dossier : `nextval` → matricule → compte → candidat → dossier).
 *
 * `neon-http` ne connaît que `db.batch()`, qui exige de connaître toutes les
 * requêtes *avant* de les envoyer : impossible ici, chaque étape consomme le
 * résultat de la précédente — d'où `tx`. Le pilote WebSocket est le seul à même
 * de l'exécuter, comme dans le seed ; il passe lui aussi par le 443.
 *
 * Coût : une connexion maintenue côté serveur, là où le client HTTP n'en garde
 * aucune. Le pool est donc réservé aux écritures qui ne peuvent pas être
 * réécrites en `db.batch()` ; `requireDb()` reste le client par défaut.
 *
 * Le type est celui du client HTTP : à l'exécution les deux pilotes exécutent
 * les mêmes requêtes et rendent les mêmes résultats (`returning()` renvoie un
 * tableau des deux côtés, `execute()` expose `.rows` des deux côtés). Ils ne
 * partagent simplement pas la même déclaration de type de résultat.
 */
function createTxDb() {
  const pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return drizzleWs(pool, { schema }) as unknown as Db;
}

let txDb: Db | null = null;

/** Client WebSocket, créé au premier usage pour ne pas ouvrir de pool au chargement. */
export function requireTxDb(): Db {
  if (!url) throw new Error("DATABASE_URL manquant : la gestion du Bacc nécessite une base PostgreSQL.");
  txDb ??= createTxDb();
  return txDb;
}