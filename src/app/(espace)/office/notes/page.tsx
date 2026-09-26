import type { Metadata } from "next";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Calculator, ClipboardList, Lock, Megaphone } from "lucide-react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { StackedBar } from "@/components/app/charts";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { FilterTabs } from "@/components/app/Pagination";
import { Alert, buttonClass, Card, EmptyState, PageHeader, Progress, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { examSessions, serieSubjects, series, subjects } from "@/db/schema";
import { candidates, exams, grades, results, scans } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { publishResults, runDeliberation } from "./actions";
import { GradeTable } from "./GradeTable";

export const metadata: Metadata = { title: "Notes et résultats" };

export default async function NotesPage({ searchParams }: PageProps<"/office/notes">) {
  const user = await requireOffice();
  const params = await searchParams;
  const serie =
    typeof params.serie === "string" && ["L", "S", "OSE"].includes(params.serie) ? params.serie : "S";
  const db = requireDb();
  const [session] = await db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1);
  const published = Boolean(session?.resultsPublishAt && session.resultsPublishAt <= new Date());
  const scheduled = Boolean(session?.resultsPublishAt && !published);

  const [allSeries, subs, people, decisions] = await Promise.all([
    db.select().from(series).orderBy(asc(series.sortOrder)),
    db
      .select({ id: subjects.id, name: subjects.name, coefficient: serieSubjects.coefficient })
      .from(serieSubjects)
      .innerJoin(subjects, eq(subjects.id, serieSubjects.subjectId))
      .where(eq(serieSubjects.serieCode, serie))
      .orderBy(sql`${subjects.code} = 'AUT'`, desc(serieSubjects.coefficient)),
    db
      .select({ id: candidates.id, matricule: candidates.matricule })
      .from(candidates)
      .where(and(eq(candidates.officeId, user.officeId), eq(candidates.serieCode, serie)))
      .orderBy(asc(candidates.matricule)),
    db
      .select({ decision: results.decision, mention: results.mention, n: count() })
      .from(results)
      .innerJoin(candidates, eq(candidates.id, results.candidateId))
      .where(eq(candidates.officeId, user.officeId))
      .groupBy(results.decision, results.mention),
  ]);

  const subjectId = Number(params.matiere) || subs[0]?.id;
  const subject = subs.find((s) => s.id === subjectId) ?? subs[0];
  const ids = people.map((p) => p.id);
  const [gradeRows, [exam]] = await Promise.all([
    ids.length ? db.select().from(grades).where(inArray(grades.candidateId, ids)) : Promise.resolve([]),
    db
      .select({ id: exams.id })
      .from(exams)
      .where(
        and(
          eq(exams.sessionId, session?.id ?? -1),
          eq(exams.serieCode, serie),
          eq(exams.subjectId, subject?.id ?? -1),
        ),
      ),
  ]);
  const entries =
    exam && ids.length
      ? await db
          .select({ candidateId: scans.candidateId })
          .from(scans)
          .where(and(eq(scans.examId, exam.id), eq(scans.type, "entry"), inArray(scans.candidateId, ids)))
      : [];
  const examPast = Boolean(exam);

  const filled = (sid: number) => gradeRows.filter((g) => g.subjectId === sid).length;
  const totalDecisions = decisions.reduce((s, d) => s + d.n, 0);
  const dec = (k: string) => decisions.filter((d) => d.decision === k).reduce((s, d) => s + d.n, 0);
  const men = (k: string) => decisions.filter((d) => d.mention === k).reduce((s, d) => s + d.n, 0);

  return (
    <>
      <PageHeader
        title="Notes et résultats"
        description="Saisie des notes par matière, délibération automatique, puis publication des résultats."
      />

      {published ? (
        <div className="mb-6">
          <Alert tone="success" title={`Résultats publiés le ${formatDateTime(session!.resultsPublishAt!)}`}>
            Les notes sont verrouillées. Seule l&apos;Administration peut revenir sur la publication.
          </Alert>
        </div>
      ) : scheduled ? (
        <div className="mb-6">
          <Alert
            tone="info"
            title={`Publication programmée le ${formatDateTime(session!.resultsPublishAt!)}`}
          >
            Jusqu&apos;à cette date, les candidats ne voient pas leurs notes.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card padded={false}>
          <div className="border-b border-line p-4">
            <FilterTabs
              param="serie"
              active={serie}
              params={{}}
              basePath="/office/notes"
              options={allSeries.map((s) => ({ value: s.code, label: `Série ${s.code}` }))}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {subs.map((s) => {
                const pct = people.length ? (filled(s.id) / people.length) * 100 : 0;
                const on = s.id === subject?.id;
                return (
                  <Link
                    key={s.id}
                    href={`/office/notes?serie=${serie}&matiere=${s.id}`}
                    scroll={false}
                    className={`w-44 rounded-xl border p-3 transition-all hover:-translate-y-0.5 ${on ? "border-vert bg-vert-soft shadow-sm" : "border-line bg-raised"}`}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-bold">
                      <span className="truncate">{s.name}</span>
                      <span className="shrink-0 rounded bg-raised px-1.5 text-xs text-muted">
                        ×{s.coefficient}
                      </span>
                    </span>
                    <span className="mt-2 block">
                      <Progress value={pct} tone={pct === 100 ? "vert" : "soleil"} />
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {filled(s.id)}/{people.length} notes
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          {people.length === 0 || !subject ? (
            <EmptyState icon={ClipboardList} title="Aucun candidat dans cette série" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <p className="font-bold">
                  {subject.name} · coefficient {subject.coefficient}
                </p>
                {published && (
                  <StatusBadge tone="neutral" icon={Lock}>
                    Verrouillé
                  </StatusBadge>
                )}
              </div>
              <GradeTable
                key={`${serie}-${subject.id}`}
                serie={serie}
                subjectId={subject.id}
                locked={published}
                rows={people.map((p) => ({
                  id: p.id,
                  matricule: p.matricule,
                  score:
                    gradeRows.find((g) => g.candidateId === p.id && g.subjectId === subject.id)?.score ??
                    null,
                  absent: examPast && entries.length > 0 && !entries.some((e) => e.candidateId === p.id),
                }))}
              />
            </>
          )}
        </Card>

        <div className="space-y-6">
          <Card
            title="Délibération"
            description={`Seuil d'admission retenu : ${session?.admissionThreshold.toLocaleString("fr-FR")}/20`}
          >
            {totalDecisions > 0 ? (
              <StackedBar
                segments={[
                  { key: "admitted", label: "Admis", value: dec("admitted"), color: "var(--vert)" },
                  { key: "failed", label: "Ajournés", value: dec("failed"), color: "var(--line-strong)" },
                  { key: "absent", label: "Absents", value: dec("absent"), color: "var(--soleil)" },
                  { key: "fraud", label: "Fraudes", value: dec("fraud"), color: "var(--danger)" },
                ]}
              />
            ) : (
              <p className="text-sm text-muted">Pas encore de délibération.</p>
            )}
            {dec("admitted") > 0 && (
              <div className="mt-5">
                <p className="t-overline text-muted">Mentions</p>
                <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                  {[
                    ["passable", "Passable"],
                    ["assez_bien", "Assez bien"],
                    ["bien", "Bien"],
                    ["tres_bien", "Très bien"],
                  ].map(([k, l]) => (
                    <div key={k} className="rounded-xl bg-sunken p-2">
                      <dd className="text-xl font-extrabold">{men(k)}</dd>
                      <dt className="text-xs text-muted">{l}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {!published && (
              <div className="mt-5">
                <ConfirmAction
                  action={runDeliberation}
                  variant={totalDecisions ? "secondary" : "primary"}
                  icon={<Calculator className="size-5" />}
                  label={totalDecisions ? "Relancer la délibération" : "Lancer la délibération"}
                  title="Calculer les résultats ?"
                  description="Moyenne pondérée par les coefficients, 0 éliminatoire, fraude et absences d'après les scans. Vous pouvez relancer tant que rien n'est publié."
                  confirmLabel="Calculer"
                />
              </div>
            )}
          </Card>

          {!published && (
            <Card
              title="Publication"
              description="Les candidats voient leurs résultats à partir de cette date."
            >
              <ActionForm action={publishResults} className="space-y-3">
                <label className="block">
                  <span className="text-sm font-semibold">Programmer (heure de Madagascar)</span>
                  <input type="datetime-local" name="when" className="field-input mt-1.5" />
                </label>
                <SubmitButton className={`${buttonClass("secondary")} w-full`} disabled={!totalDecisions}>
                  Programmer la publication
                </SubmitButton>
              </ActionForm>
              <div className="my-4 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
              </div>
              <ConfirmAction
                action={publishResults}
                variant="soleil"
                icon={<Megaphone className="size-5" />}
                label="Publier maintenant"
                title="Publier les résultats maintenant ?"
                description="Les notes seront verrouillées et les candidats prévenus. Seule l'Administration pourra revenir en arrière."
                confirmLabel="Publier"
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
