import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Sonde de santé (Render : `healthCheckPath`). Répond toujours 200 tant que le
 * serveur tourne : une lenteur passagère de la base ne doit pas faire
 * redémarrer le service. L'état de la base est indiqué à titre d'information.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let database: "up" | "down" | "not-configured" = "not-configured";
  if (db) {
    try {
      await Promise.race([
        db.execute(sql`select 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]);
      database = "up";
    } catch {
      database = "down";
    }
  }
  return Response.json(
    { status: "ok", database, time: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
