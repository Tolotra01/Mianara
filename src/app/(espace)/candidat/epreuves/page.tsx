import type { Metadata } from "next";
import { and, asc, eq } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { Card, DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { exams, scans } from "@/db/schema-gestion";
import { requireCandidate } from "@/lib/auth";
import { formatDay, formatTime, scanState } from "@/lib/bac-rules";

export const metadata: Metadata = { title: "Mes épreuves" };

export default async function EpreuvesPage() {
  const { candidate: c } = await requireCandidate();
  const db = requireDb();
  const [list, mine] = await Promise.all([
    db
      .select({ id: exams.id, subject: subjects.name, startsAt: exams.startsAt, endsAt: exams.endsAt })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(
        and(eq(exams.sessionId, c.sessionId), eq(exams.serieCode, c.serieCode), eq(exams.isPublished, true)),
      )
      .orderBy(asc(exams.startsAt)),
    db.select({ examId: scans.examId, type: scans.type }).from(scans).where(eq(scans.candidateId, c.id)),
  ]);
  const now = new Date();
  return (
    <>
      <PageHeader
        title="Mes épreuves"
        description={`Emploi du temps officiel de la série ${c.serieCode}, et votre présence enregistrée.`}
      />
      <Card padded={false}>
        {list.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Emploi du temps à venir"
            description="Il apparaîtra ici dès sa publication par l'Office du Bacc."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Horaire</th>
                <th>Épreuve</th>
                <th>Ma présence</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {list.map((e, i) => {
                const st = scanState(mine.filter((s) => s.examId === e.id).map((s) => s.type));
                const live = e.startsAt <= now && e.endsAt >= now;
                return (
                  <tr
                    key={e.id}
                    style={{ "--i": i } as React.CSSProperties}
                    className={live ? "bg-soleil-soft" : ""}
                  >
                    <td className="font-semibold first-letter:uppercase">{formatDay(e.startsAt)}</td>
                    <td className="tabular-nums">
                      {formatTime(e.startsAt)} – {formatTime(e.endsAt)}
                    </td>
                    <td className="font-bold">{e.subject}</td>
                    <td>
                      {st.fraud ? (
                        <StatusBadge tone="danger">Fraude signalée</StatusBadge>
                      ) : st.ended ? (
                        <StatusBadge tone="success">Copie remise</StatusBadge>
                      ) : st.entered ? (
                        <StatusBadge tone="info">Présent</StatusBadge>
                      ) : e.endsAt < now ? (
                        <StatusBadge tone="warning">Absent</StatusBadge>
                      ) : live ? (
                        <StatusBadge tone="brand">En cours</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">À venir</StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
