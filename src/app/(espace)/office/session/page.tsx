import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";
import { CalendarClock, Lock, Megaphone, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { FilterTabs } from "@/components/app/Pagination";
import { Alert, Card, DataTable, EmptyState, KeyValues, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { examSessions, serieSubjects, series, subjects } from "@/db/schema";
import { exams } from "@/db/schema-gestion";
import { requireUser } from "@/lib/auth";
import {
  formatAriary,
  formatDate,
  formatDateTime,
  formatDay,
  formatTime,
  toLocalInput,
} from "@/lib/bac-rules";
import { deleteExam, publishTimetable } from "./actions";
import { ExamModal } from "./ExamModal";

export const metadata: Metadata = { title: "Emploi du temps" };

export default async function SessionPage({ searchParams }: PageProps<"/office/session">) {
  await requireUser(["office"]);
  const params = await searchParams;
  const serie =
    typeof params.serie === "string" && ["L", "S", "OSE"].includes(params.serie) ? params.serie : "S";
  const db = requireDb();
  const [session] = await db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1);
  if (!session)
    return (
      <Alert tone="warning" title="Aucune session en cours">
        L&apos;Admin doit ouvrir la session.
      </Alert>
    );

  const [list, serieSubs, allSeries] = await Promise.all([
    db
      .select({
        id: exams.id,
        subjectId: exams.subjectId,
        subject: subjects.name,
        startsAt: exams.startsAt,
        endsAt: exams.endsAt,
        isPublished: exams.isPublished,
      })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(and(eq(exams.sessionId, session.id), eq(exams.serieCode, serie)))
      .orderBy(asc(exams.startsAt)),
    db
      .select({ id: subjects.id, name: subjects.name })
      .from(serieSubjects)
      .innerJoin(subjects, eq(subjects.id, serieSubjects.subjectId))
      .where(eq(serieSubjects.serieCode, serie))
      .orderBy(desc(serieSubjects.coefficient)),
    db.select().from(series).orderBy(asc(series.sortOrder)),
  ]);
  const published = list.length > 0 && list.every((e) => e.isPublished);
  const pending = list.filter((e) => !e.isPublished).length;

  // Regroupement par jour pour l'affichage en planning.
  const days = new Map<string, typeof list>();
  for (const e of list) {
    const key = formatDay(e.startsAt);
    days.set(key, [...(days.get(key) ?? []), e]);
  }

  return (
    <>
      <PageHeader
        title="Emploi du temps"
        description={`Session ${session.year} : épreuves par série. Une fois publié, l'emploi du temps est verrouillé et figure sur les convocations.`}
      />

      <Card
        title="Paramètres de la session"
        description="Fixés par l'Administration nationale."
        className="mb-6"
      >
        <KeyValues
          items={[
            {
              label: "Épreuves",
              value:
                session.examsStart && session.examsEnd
                  ? `${formatDate(session.examsStart)} → ${formatDate(session.examsEnd)}`
                  : "À fixer",
            },
            {
              label: "Publication des résultats",
              value: session.resultsPublishAt ? formatDateTime(session.resultsPublishAt) : "Non programmée",
            },
            { label: "Seuil d'admission", value: `${session.admissionThreshold.toLocaleString("fr-FR")}/20` },
            { label: "Demandes de relevé", value: `J+${session.transcriptDelayDays} après publication` },
            { label: "Relevé de notes", value: formatAriary(session.transcriptFee) },
            { label: "Diplôme", value: formatAriary(session.diplomaFee) },
          ]}
        />
      </Card>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterTabs
            param="serie"
            active={serie}
            params={params}
            basePath="/office/session"
            options={allSeries.map((s) => ({ value: s.code, label: `Série ${s.code}` }))}
          />
          <div className="flex flex-wrap items-center gap-2">
            {published ? (
              <StatusBadge tone="success" icon={Lock}>
                Publié et verrouillé
              </StatusBadge>
            ) : (
              <>
                <ExamModal
                  serieCode={serie}
                  subjects={serieSubs.filter((s) => !list.some((e) => e.subjectId === s.id))}
                />
                {pending > 0 && (
                  <ConfirmAction
                    action={publishTimetable}
                    fields={{ serieCode: serie }}
                    size="sm"
                    icon={<Megaphone className="size-4" />}
                    label="Publier"
                    title={`Publier l'emploi du temps de la série ${serie} ?`}
                    description="Il deviendra visible des candidats, figurera sur les convocations et ne pourra plus être modifié."
                    confirmLabel="Publier"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Aucune épreuve"
            description={`Ajoutez les épreuves de la série ${serie}.`}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Jour</th>
                <th>Horaire</th>
                <th>Épreuve</th>
                <th>Durée</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...days.entries()].flatMap(([day, items]) =>
                items.map((e, i) => (
                  <tr key={e.id}>
                    <td className="font-semibold first-letter:uppercase">{i === 0 ? day : ""}</td>
                    <td className="tabular-nums">
                      {formatTime(e.startsAt)} – {formatTime(e.endsAt)}
                    </td>
                    <td className="font-bold">{e.subject}</td>
                    <td className="text-muted tabular-nums">
                      {Math.round(((e.endsAt.getTime() - e.startsAt.getTime()) / 36e5) * 10) / 10} h
                    </td>
                    <td>
                      {e.isPublished ? (
                        <StatusBadge tone="success">Publiée</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Brouillon</StatusBadge>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      {!e.isPublished && (
                        <span className="inline-flex gap-1">
                          <ExamModal
                            serieCode={serie}
                            subjects={serieSubs.filter(
                              (s) => s.id === e.subjectId || !list.some((x) => x.subjectId === s.id),
                            )}
                            exam={{
                              id: e.id,
                              subjectId: e.subjectId,
                              startsAt: toLocalInput(e.startsAt),
                              endsAt: toLocalInput(e.endsAt),
                            }}
                          />
                          <ConfirmAction
                            action={deleteExam}
                            fields={{ id: String(e.id) }}
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 className="size-4" />}
                            label={<span className="sr-only">Supprimer</span>}
                            title={`Supprimer l'épreuve de ${e.subject} ?`}
                            confirmLabel="Supprimer"
                          />
                        </span>
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
