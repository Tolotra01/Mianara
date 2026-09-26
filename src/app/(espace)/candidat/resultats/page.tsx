import type { Metadata } from "next";
import { and, desc, eq, sql } from "drizzle-orm";
import { Award, Clock, PartyPopper } from "lucide-react";
import { Countdown } from "@/components/app/Countdown";
import { Card, DataTable, LinkButton, PageHeader } from "@/components/app/ui";
import { Sparkle } from "@/components/illustrations/parts";
import { requireDb } from "@/db";
import { examSessions, serieSubjects, subjects } from "@/db/schema";
import { grades, results } from "@/db/schema-gestion";
import { requireCandidate } from "@/lib/auth";
import { DECISION_LABEL, formatDateTime, MENTION_LABEL } from "@/lib/bac-rules";

export const metadata: Metadata = { title: "Mes résultats" };

export default async function ResultatsPage() {
  const { candidate: c } = await requireCandidate();
  const db = requireDb();
  const [session] = await db.select().from(examSessions).where(eq(examSessions.id, c.sessionId));
  const published = Boolean(session.resultsPublishAt && session.resultsPublishAt <= new Date());

  // RG-09 : rien n'est lu avant la publication.
  if (!published) {
    return (
      <>
        <PageHeader title="Mes résultats" />
        <Card>
          <div className="flex flex-col items-center py-10 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-soleil-soft text-warning">
              <Clock className="size-8" />
            </span>
            <h2 className="t-h2 mt-4">Résultats pas encore publiés</h2>
            {session.resultsPublishAt ? (
              <>
                <p className="mt-1 text-muted">Publication le {formatDateTime(session.resultsPublishAt)}.</p>
                <div className="mt-6 rounded-2xl bg-vert p-4 text-on-vert">
                  <Countdown to={session.resultsPublishAt.toISOString()} />
                </div>
              </>
            ) : (
              <p className="mt-1 max-w-md text-muted">
                Vous serez prévenu dans votre espace (et par SMS si votre numéro est renseigné) dès leur
                publication.
              </p>
            )}
          </div>
        </Card>
      </>
    );
  }

  const [[result], rows] = await Promise.all([
    db.select().from(results).where(eq(results.candidateId, c.id)),
    db
      .select({ subject: subjects.name, coefficient: serieSubjects.coefficient, score: grades.score })
      .from(serieSubjects)
      .innerJoin(subjects, eq(subjects.id, serieSubjects.subjectId))
      .leftJoin(grades, and(eq(grades.subjectId, serieSubjects.subjectId), eq(grades.candidateId, c.id)))
      .where(eq(serieSubjects.serieCode, c.serieCode))
      .orderBy(sql`${subjects.code} = 'AUT'`, desc(serieSubjects.coefficient)),
  ]);
  const admitted = result?.decision === "admitted";

  return (
    <>
      <PageHeader title="Mes résultats" description={`Baccalauréat ${session.year} · série ${c.serieCode}`} />
      <section
        className={`anim-pop relative overflow-hidden rounded-3xl p-8 text-center shadow-md ${admitted ? "bg-vert text-on-vert" : "border border-line bg-raised"}`}
      >
        {admitted && (
          <svg viewBox="0 0 400 200" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
            {[
              [28, 28, 10, "#F2B33D"],
              [372, 30, 12, "#F2B33D"],
              [20, 178, 7, "#FBEAE4"],
              [382, 172, 8, "#F2B33D"],
              [330, 100, 5, "#FBEAE4"],
            ].map(([x, y, r, f], i) => (
              <Sparkle
                key={i}
                x={Number(x)}
                y={Number(y)}
                r={Number(r)}
                fill={String(f)}
                className="a-float"
              />
            ))}
          </svg>
        )}
        <span
          className={`relative mx-auto grid size-16 place-items-center rounded-full ${admitted ? "bg-soleil text-ink" : "bg-sunken text-muted"}`}
        >
          {admitted ? <PartyPopper className="size-8" /> : <Award className="size-8" />}
        </span>
        <p className="t-overline relative mt-4 opacity-80">Décision du jury</p>
        <h2 className="t-display relative mt-1">
          {result ? DECISION_LABEL[result.decision] : "—"}
          {result?.mention ? ` · ${MENTION_LABEL[result.mention]}` : ""}
        </h2>
        {result?.average != null && (
          <p className="relative mt-2 text-xl font-bold">
            Moyenne générale : {result.average.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}/20
          </p>
        )}
        {admitted ? (
          <p className="relative mt-3 opacity-90">
            Félicitations !{" "}
            {session.transcriptDelayDays
              ? `Votre demande de relevé ouvre ${session.transcriptDelayDays} jours après la publication.`
              : "Vous pouvez demander votre relevé de notes."}
          </p>
        ) : (
          <p className="relative mt-3 text-muted">
            Pour toute question sur votre résultat, adressez-vous à l&apos;Office du Bac.
          </p>
        )}
        {admitted && (
          <div className="relative mt-5">
            <LinkButton href="/candidat/demandes" variant="soleil">
              Demander mon relevé de notes
            </LinkButton>
          </div>
        )}
      </section>

      <Card title="Notes par matière" className="mt-6" padded={false}>
        <DataTable>
          <thead>
            <tr>
              <th>Matière</th>
              <th>Coefficient</th>
              <th>Note /20</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.subject}>
                <td className="font-semibold">{r.subject}</td>
                <td className="tabular-nums">{r.coefficient}</td>
                <td className={`font-bold tabular-nums ${r.score === 0 ? "text-danger" : ""}`}>
                  {r.score?.toLocaleString("fr-FR") ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>
    </>
  );
}
