import type { Metadata } from "next";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  Download,
  FileText,
  type LucideIcon,
  Ticket,
  UserCheck,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { Countdown } from "@/components/app/Countdown";
import { Card, LinkButton, Mono, StatusBadge } from "@/components/app/ui";
import { AssistantAvatar } from "@/components/illustrations/AssistantAvatar";
import { requireDb } from "@/db";
import { examSessions, subjects } from "@/db/schema";
import { documentRequests, examCenters, exams, notifications, results, rooms } from "@/db/schema-gestion";
import { requireCandidate } from "@/lib/auth";
import { DECISION_LABEL, formatDateTime, formatDay, formatTime, MENTION_LABEL } from "@/lib/bac-rules";
import { DOC_LABEL, REQUEST_STATUS } from "@/lib/labels";

export const metadata: Metadata = { title: "Mon espace" };

export default async function CandidatHome() {
  const { user, candidate: c } = await requireCandidate();
  const db = requireDb();
  const now = new Date();
  const [[session], [place], [nextExam], [result], requests, notes, [anyExam]] = await Promise.all([
    db.select().from(examSessions).where(eq(examSessions.id, c.sessionId)),
    db
      .select({ center: examCenters.name, city: examCenters.city, room: rooms.name })
      .from(rooms)
      .innerJoin(examCenters, eq(examCenters.id, rooms.centerId))
      .where(eq(rooms.id, c.roomId ?? -1)),
    db
      .select({ subject: subjects.name, startsAt: exams.startsAt, endsAt: exams.endsAt })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(
        and(
          eq(exams.sessionId, c.sessionId),
          eq(exams.serieCode, c.serieCode),
          eq(exams.isPublished, true),
          gte(exams.endsAt, now),
        ),
      )
      .orderBy(asc(exams.startsAt))
      .limit(1),
    db.select().from(results).where(eq(results.candidateId, c.id)),
    db.select().from(documentRequests).where(eq(documentRequests.candidateId, c.id)),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(4),
    db
      .select({ id: exams.id })
      .from(exams)
      .where(
        and(eq(exams.sessionId, c.sessionId), eq(exams.serieCode, c.serieCode), eq(exams.isPublished, true)),
      )
      .limit(1),
  ]);

  const published = Boolean(session.resultsPublishAt && session.resultsPublishAt <= now);
  const transcript = requests.find((r) => r.type === "transcript");
  const diploma = requests.find((r) => r.type === "diploma");
  const examsOver = published || (Boolean(anyExam) && !nextExam);

  const steps: { label: string; icon: LucideIcon; done: boolean }[] = [
    { label: "Inscription", icon: UserCheck, done: true },
    { label: "Convocation", icon: Ticket, done: Boolean(c.roomId) },
    { label: "Épreuves", icon: PenLine, done: examsOver },
    { label: "Résultats", icon: Award, done: published },
    { label: "Relevé", icon: FileText, done: transcript?.status === "delivered" },
    { label: "Diplôme", icon: FileText, done: diploma?.status === "delivered" },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-vert p-6 text-on-vert shadow-md sm:p-8">
        <div className="lamba absolute inset-x-0 bottom-0 h-2 opacity-90" aria-hidden />
        <div className="flex flex-wrap items-center gap-6">
          <AssistantAvatar className="hidden size-20 ring-4 ring-on-vert/20 sm:block" title="" />
          <div className="min-w-0 flex-1">
            <p className="t-overline opacity-80">
              Série {c.serieCode} · Session {session.year}
            </p>
            <h1 className="t-h1 mt-1">Salama, {c.firstName} !</h1>
            <p className="mt-1 opacity-90">
              Matricule <span className="font-mono font-semibold tracking-wide">{c.matricule}</span>
            </p>
          </div>
          {nextExam && !published && (
            <div>
              <p className="mb-2 text-sm font-semibold opacity-90">Prochaine épreuve : {nextExam.subject}</p>
              <Countdown to={nextExam.startsAt.toISOString()} />
            </div>
          )}
        </div>
      </section>

      <Card className="mt-6" title="Mon parcours">
        <ol className="grid grid-cols-3 gap-y-6 sm:grid-cols-6">
          {steps.map((s, i) => {
            const state = s.done ? "done" : i === current ? "current" : "todo";
            return (
              <li key={s.label} className="relative flex flex-col items-center text-center">
                {i > 0 && (
                  <span
                    className={`absolute top-6 right-1/2 hidden h-1 w-full sm:block ${steps[i - 1].done ? "bg-vert" : "bg-line"}`}
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-10 grid size-12 place-items-center rounded-full ring-4 ring-raised transition-all ${
                    state === "done"
                      ? "bg-vert text-on-vert"
                      : state === "current"
                        ? "bg-soleil text-ink shadow-md"
                        : "bg-sunken text-muted"
                  }`}
                >
                  {state === "current" && (
                    <span className="anim-ping absolute inset-0 rounded-full bg-soleil/60" />
                  )}
                  {state === "done" ? (
                    <Check className="relative size-5" />
                  ) : (
                    <s.icon className="relative size-5" />
                  )}
                </span>
                <span className={`mt-2 text-sm font-bold ${state === "todo" ? "text-muted" : ""}`}>
                  {s.label}
                </span>
                {state === "current" && <span className="text-xs font-semibold text-warning">En cours</span>}
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="stagger mt-6 grid gap-6 lg:grid-cols-3">
        <div style={{ "--i": 0 } as React.CSSProperties}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <Ticket className="size-5 text-vert" /> Ma convocation
              </span>
            }
            className="h-full"
          >
            {place ? (
              <p>
                <span className="block font-bold">{place.center}</span>
                <span className="block text-muted">
                  {place.room} · place n° {c.seatNumber} · {place.city}
                </span>
              </p>
            ) : (
              <p className="text-muted">Affectation au centre d&apos;examen en cours.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href={`/api/convocations/${c.id}?telecharger`} size="sm" prefetch={false}>
                <Download className="size-4" /> Télécharger
              </LinkButton>
              <LinkButton href="/candidat/convocation" size="sm" variant="secondary">
                Voir
              </LinkButton>
            </div>
          </Card>
        </div>

        <div style={{ "--i": 1 } as React.CSSProperties}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <Award className="size-5 text-mena" /> Mon résultat
              </span>
            }
            className="h-full"
          >
            {published && result ? (
              <>
                <StatusBadge tone={result.decision === "admitted" ? "success" : "neutral"}>
                  {DECISION_LABEL[result.decision]}
                  {result.mention ? ` · ${MENTION_LABEL[result.mention]}` : ""}
                </StatusBadge>
                <p className="mt-2 text-3xl font-extrabold">
                  {result.average?.toLocaleString("fr-FR") ?? "—"}
                  <span className="text-lg text-muted">/20</span>
                </p>
              </>
            ) : (
              <p className="text-muted">
                {session.resultsPublishAt
                  ? `Publication le ${formatDateTime(session.resultsPublishAt)}.`
                  : "Les résultats ne sont pas encore publiés."}
              </p>
            )}
            <Link
              href="/candidat/resultats"
              className="mt-4 inline-flex items-center gap-1 font-semibold text-vert hover:underline"
            >
              Détail <ArrowRight className="size-4" />
            </Link>
          </Card>
        </div>

        <div style={{ "--i": 2 } as React.CSSProperties}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <FileText className="size-5 text-info" /> Relevé et diplôme
              </span>
            }
            className="h-full"
          >
            {requests.length === 0 ? (
              <p className="text-muted">
                {published && result?.decision === "admitted"
                  ? `La demande de relevé ouvre ${session.transcriptDelayDays} jours après la publication.`
                  : "Disponible pour les candidats admis, après la publication des résultats."}
              </p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="block font-semibold">{DOC_LABEL[r.type]}</span>
                      <Mono>{r.number}</Mono>
                    </span>
                    <StatusBadge tone={REQUEST_STATUS[r.status].tone}>
                      {REQUEST_STATUS[r.status].label}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/candidat/demandes"
              className="mt-4 inline-flex items-center gap-1 font-semibold text-vert hover:underline"
            >
              Mes demandes <ArrowRight className="size-4" />
            </Link>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card
          title={
            <span className="flex items-center gap-2">
              <CalendarDays className="size-5 text-vert" /> Prochaine épreuve
            </span>
          }
        >
          {nextExam ? (
            <p>
              <span className="t-h2 block">{nextExam.subject}</span>
              <span className="text-muted first-letter:uppercase">
                {formatDay(nextExam.startsAt)} · {formatTime(nextExam.startsAt)} –{" "}
                {formatTime(nextExam.endsAt)}
              </span>
              <span className="mt-3 block text-sm">
                Arrivez 30 minutes avant, avec votre convocation et une pièce d&apos;identité.
              </span>
            </p>
          ) : (
            <p className="text-muted">
              {anyExam ? "Toutes vos épreuves sont passées." : "L'emploi du temps n'est pas encore publié."}
            </p>
          )}
        </Card>
        <Card
          title="Dernières notifications"
          actions={
            <Link href="/candidat/notifications" className="text-sm font-semibold text-vert hover:underline">
              Tout voir
            </Link>
          }
        >
          <ul className="space-y-3">
            {notes.length === 0 && <li className="text-sm text-muted">Aucune notification.</li>}
            {notes.map((n) => (
              <li key={n.id} className="flex gap-3">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-mena"}`} />
                <span className="text-sm">
                  <span className="font-bold">{n.title}</span>
                  <span className="block text-muted">{n.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
