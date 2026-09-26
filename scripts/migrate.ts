/**
 * Applique les migrations Drizzle (dossier `drizzle/`). Lancé à chaque build
 * sur Render (`pnpm db:migrate`) et utilisable en local.
 *
 * Mise en service d'une base créée avec `drizzle-kit push` : son schéma
 * correspond déjà aux migrations jusqu'à BASELINE, mais la table de suivi de
 * Drizzle n'existe pas. Rejouer 0000 échouerait (« type already exists ») :
 * au premier passage, on enregistre donc 0000 → BASELINE comme appliquées,
 * sans les exécuter, puis le migrateur applique normalement les suivantes.
 * Cette étape ne se produit qu'une fois : ensuite la table de suivi existe.
 */
import "dotenv/config";
import "../src/db/network";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const FOLDER = path.join(process.cwd(), "drizzle");
/** Dernière migration déjà présente dans une base créée par `drizzle-kit push`. */
const BASELINE = "0003_concerned_cloak";

type Journal = { entries: { idx: number; when: number; tag: string }[] };

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant : impossible d'appliquer les migrations.");

  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 30, onnotice: () => {} });
  try {
    const [{ tracked }] = await sql`select to_regclass('drizzle.__drizzle_migrations') is not null as tracked`;
    const [{ populated }] = await sql`select to_regclass('public.users') is not null as populated`;

    if (!tracked && populated) {
      const journal: Journal = JSON.parse(readFileSync(path.join(FOLDER, "meta", "_journal.json"), "utf8"));
      const upTo = journal.entries.findIndex((e) => e.tag === BASELINE);
      if (upTo < 0) throw new Error(`Migration de référence ${BASELINE} absente du journal.`);
      const done = journal.entries.slice(0, upTo + 1);

      await sql.begin(async (tx) => {
        await tx`create schema if not exists drizzle`;
        await tx`create table if not exists drizzle.__drizzle_migrations (
          id serial primary key, hash text not null, created_at bigint)`;
        for (const e of done) {
          // Même empreinte que le migrateur de Drizzle : SHA-256 du fichier SQL.
          const hash = createHash("sha256").update(readFileSync(path.join(FOLDER, `${e.tag}.sql`)).toString()).digest("hex");
          await tx`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${e.when})`;
        }
      });
      console.log(`Base existante : ${done.length} migrations (jusqu'à ${BASELINE}) enregistrées comme déjà appliquées.`);
    }

    await migrate(drizzle(sql), { migrationsFolder: FOLDER });
    const [{ count }] = await sql`select count(*)::int as count from drizzle.__drizzle_migrations`;
    console.log(`Migrations à jour (${count} appliquées).`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Échec des migrations :", err instanceof Error ? err.message : err);
  process.exit(1);
});
