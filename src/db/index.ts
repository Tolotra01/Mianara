import "./network";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as vitrine from "./schema";
import * as gestion from "./schema-gestion";
import * as learning from "./schema-learning";

const schema = { ...vitrine, ...gestion, ...learning };

const url = process.env.DATABASE_URL;

// Une seule connexion par processus, même quand le code est rechargé en développement.
const globalForDb = globalThis as unknown as { mianaraSql?: postgres.Sql };

// `prepare: false` : compatible avec le pooler de Supabase (mode transaction) et avec Neon.
const client = url
  ? (globalForDb.mianaraSql ??= postgres(url, {
      prepare: false,
      max: 10,
      connect_timeout: 30,
      // Le pooler ferme les connexions inactives : on les recycle avant qu'elles ne cassent.
      idle_timeout: 20,
      max_lifetime: 60 * 10,
    }))
  : null;

/** `null` quand DATABASE_URL n'est pas défini : la vitrine lit alors src/content/bac.ts. */
export const db = client ? drizzle(client, { schema }) : null;

export type Db = NonNullable<typeof db>;

/** La gestion (comptes, candidats, épreuves…) n'a pas de repli : la base est obligatoire. */
export function requireDb(): Db {
  if (!db) throw new Error("DATABASE_URL manquant : la gestion du Bac nécessite une base PostgreSQL.");
  return db;
}
