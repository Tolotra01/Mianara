import { desc, eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { auditLogs, users } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** ADM-04 : export du journal complet (10 000 dernières lignes). */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Accès refusé", { status: 403 });
  const rows = await requireDb()
    .select({ l: auditLogs, who: users.username })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10000);
  const header = ["Date", "Auteur", "Action", "Table", "Enregistrement", "IP", "Avant", "Après"];
  const lines = rows.map(({ l, who }) =>
    [
      l.createdAt.toISOString(),
      who,
      l.action,
      l.tableName,
      l.recordId,
      l.ip,
      JSON.stringify(l.oldData ?? ""),
      JSON.stringify(l.newData ?? ""),
    ]
      .map(csv)
      .join(";"),
  );
  return new Response("﻿" + [header.map(csv).join(";"), ...lines].join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="journal-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
