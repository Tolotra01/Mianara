import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

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
