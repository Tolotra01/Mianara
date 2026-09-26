// Script de diagnostic de la connexion (lancé à la main avec `tsx`).
// Les imports ne portent pas d'extension : `moduleResolution: "bundler"`
// l'interdit, et `tsx` n'en a pas besoin.
import { db } from "./src/db/index";
import { series } from "./src/db/schema";

async function main() {
  console.log("db null ?", db === null);
  if (!db) return;

  try {
    const r = await db.select().from(series);
    console.log("OK rows:", r.length, r.map((x: { code: string }) => x.code).join(","));
  } catch (e) {
    const err = e as Error & { cause?: unknown };
    console.log("ECHEC:", err.message);
    let c: unknown = err.cause;
    let i = 0;
    while (c && i < 5) {
      const m = c as Error;
      console.log("cause[" + i + "]:", m.message ?? String(c));
      c = m.cause;
      i++;
    }
  }
}

void main();
