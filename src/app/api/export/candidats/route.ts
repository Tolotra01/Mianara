import { asc, eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidates, examCenters, rooms } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Export CSV des candidats de l'Office (ouvrable dans Excel : séparateur « ; », BOM UTF-8). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "office" || !user.officeId) return new Response("Accès refusé", { status: 403 });
  const rows = await requireDb()
    .select({ c: candidates, center: examCenters.name, room: rooms.name })
    .from(candidates)
    .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .where(eq(candidates.officeId, user.officeId))
    .orderBy(asc(candidates.matricule));
  const header = [
    "Matricule",
    "Nom",
    "Prénoms",
    "Né(e) le",
    "Lieu",
    "Sexe",
    "Série",
    "Type",
    "Établissement",
    "Centre",
    "Salle",
    "Place",
    "Statut",
  ];
  const lines = rows.map(({ c, center, room }) =>
    [
      c.matricule,
      c.lastName,
      c.firstName,
      c.birthDate,
      c.birthPlace,
      c.gender,
      c.serieCode,
      c.kind,
      c.schoolName,
      center,
      room,
      c.seatNumber,
      c.status,
    ]
      .map(csv)
      .join(";"),
  );
  return new Response("﻿" + [header.map(csv).join(";"), ...lines].join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="candidats-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
