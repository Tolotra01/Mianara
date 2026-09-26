import "./network";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

// `prepare: false` : compatible avec le pooler de Supabase (mode transaction) et avec Neon.
const client = url ? postgres(url, { prepare: false, max: 5, connect_timeout: 30 }) : null;

/** `null` quand DATABASE_URL n'est pas défini : les données viennent alors de src/content/bac.ts. */
export const db = client ? drizzle(client, { schema }) : null;
