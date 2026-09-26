import type { Metadata } from "next";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { Activity, CalendarClock, ShieldAlert, Smartphone } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/app/AutoRefresh";
import { StackedBar } from "@/components/app/charts";
import { Alert, Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { examSessions, subjects } from "@/db/schema";
import { candidates, examCenters, exams, rooms, scans, users } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatDay, formatTime, scanState, TIME_ZONE } from "@/lib/bac-rules";

export const metadata: Metadata = { title: "Épreuves en direct" };

/** Bornes (UTC) de la journée en cours à Madagascar. */
function madagascarDay(now = new Date()) {
  const ymd = now.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
  const start = new Date(`${ymd}T00:00:00+03:00`);
  return { start, end: new Date(start.getTime() + 86400000) };
}

const COLORS = {
  inRoom: "var(--vert)",
  out: "var(--soleil)",
  ended: "var(--info)",
  fraud: "var(--danger)",
  absent: "var(--line-strong)",
};

export default async function EpreuvesPage() {
  const user = await requireOffice();
  const db = requireDb();
  const [session] = await db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1);
  const now = new Date();
  let { start, end } = madagascarDay(now);

  let dayExams = await db
    .select({
      id: exams.id,
      serie: exams.serieCode,
      subject: subjects.name,
      startsAt: exams.startsAt,
      endsAt: exams.endsAt,
    })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(
      and(
        eq(exams.sessionId, session?.id ?? -1),
        eq(exams.isPublished, true),
        gte(exams.startsAt, start),
        lt(exams.startsAt, end),
      ),
    )
    .orderBy(asc(exams.startsAt));
  const today = dayExams.length > 0;

  // Pas d'épreuve aujourd'hui : on présente la prochaine journée d'épreuves.
  if (!today) {
    const [next] = await db
      .select({ startsAt: exams.startsAt })
      .from(exams)
      .where(
        and(eq(exams.sessionId, session?.id ?? -1), eq(exams.isPublished, true), gte(exams.startsAt, now)),
      )
      .orderBy(asc(exams.startsAt))
      .limit(1);
    if (next) {
      ({ start, end } = madagascarDay(next.startsAt));
      dayExams = await db
        .select({
          id: exams.id,
          serie: exams.serieCode,
          subject: subjects.name,
          startsAt: exams.startsAt,
          endsAt: exams.endsAt,
        })
        .from(exams)
        .innerJoin(subjects, eq(subjects.id, exams.subjectId))
        .where(
          and(
            eq(exams.sessionId, session?.id ?? -1),
            eq(exams.isPublished, true),
            gte(exams.startsAt, start),
            lt(exams.startsAt, end),
          ),
        )
        .orderBy(asc(exams.startsAt));
    }
  }

  const ids = dayExams.map((e) => e.id);
  const [expected, dayScans] = await Promise.all([
    db
      .select({
        id: candidates.id,
        serie: candidates.serieCode,
        roomId: candidates.roomId,
        room: rooms.name,
        center: examCenters.name,
      })
      .from(candidates)
      .leftJoin(rooms, eq(rooms.id, candidates.roomId))
      .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
      .where(eq(candidates.officeId, user.officeId)),
    ids.length
      ? db
          .select({
            examId: scans.examId,
            candidateId: scans.candidateId,
            type: scans.type,
            at: scans.scannedAt,
            comment: scans.comment,
            by: users.fullName,
            matricule: candidates.matricule,
            name: candidates.lastName,
          })
          .from(scans)
          .innerJoin(candidates, eq(candidates.id, scans.candidateId))
          .innerJoin(users, eq(users.id, scans.scannedBy))
          .where(and(inArray(scans.examId, ids), eq(candidates.officeId, user.officeId)))
          .orderBy(asc(scans.scannedAt))
      : Promise.resolve([]),
  ]);

  const summaries = dayExams.map((exam) => {
    const concerned = expected.filter((c) => c.serie === exam.serie);
    const started = exam.startsAt <= now;
    const counts = { inRoom: 0, out: 0, ended: 0, fraud: 0, absent: 0, waiting: 0 };
    const byRoom = new Map<string, typeof counts & { label: string; total: number }>();
    for (const c of concerned) {
      const st = scanState(
        dayScans.filter((s) => s.examId === exam.id && s.candidateId === c.id).map((s) => s.type),
      );
      const key = st.fraud
        ? "fraud"
        : st.ended
          ? "ended"
          : st.out
            ? "out"
            : st.entered
              ? "inRoom"
              : started
                ? "absent"
                : "waiting";
      counts[key]++;
      const label = c.room ? `${c.center} · ${c.room}` : "Sans salle";
      const room = byRoom.get(label) ?? {
        label,
        total: 0,
        inRoom: 0,
        out: 0,
        ended: 0,
        fraud: 0,
        absent: 0,
        waiting: 0,
      };
      room[key]++;
      room.total++;
      byRoom.set(label, room);
    }
    const live =
      exam.startsAt.getTime() - 30 * 60000 <= now.getTime() &&
      now.getTime() <= exam.endsAt.getTime() + 30 * 60000;
    return {
      exam,
      counts,
      total: concerned.length,
      rooms: [...byRoom.values()],
      live,
      done: exam.endsAt < now,
    };
  });

  const incidents = dayScans
    .filter((s) => s.type === "fraud" || s.type === "exit")
    .slice(-12)
    .reverse();

  return (
    <>
      <PageHeader
        title="Épreuves en direct"
        description={
          today
            ? "Présence en temps réel, d'après les scans des surveillants."
            : `Aucune épreuve aujourd'hui. Prochaine journée : ${dayExams[0] ? formatDay(dayExams[0].startsAt) : "à programmer"}.`
        }
        actions={<AutoRefresh seconds={10} />}
      />
      <div className="mb-6">
        <Alert tone="info" title="Les scans arrivent de l'application mobile Mianara Contrôle">
          Les surveillants scannent les convocations, même hors connexion ; les données se synchronisent dès
          que le réseau revient.
        </Alert>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarClock}
            title="Aucune épreuve programmée"
            description="Publiez l'emploi du temps pour suivre les épreuves ici."
            action={
              <Link href="/office/session" className="font-semibold text-vert hover:underline">
                Ouvrir l&apos;emploi du temps
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="stagger grid gap-6 xl:grid-cols-2">
          {summaries.map((s, i) => (
            <section
              key={s.exam.id}
              style={{ "--i": i } as React.CSSProperties}
              className={`rounded-2xl border bg-raised p-5 shadow-sm ${s.live ? "border-vert" : "border-line"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-muted">
                    <span className="rounded-md bg-sunken px-2 py-0.5 font-bold text-ink">
                      Série {s.exam.serie}
                    </span>
                    {formatTime(s.exam.startsAt)} – {formatTime(s.exam.endsAt)}
                  </p>
                  <h2 className="t-h2 mt-1">{s.exam.subject}</h2>
                </div>
                {s.live ? (
                  <StatusBadge tone="success" icon={Activity}>
                    En cours
                  </StatusBadge>
                ) : s.done ? (
                  <StatusBadge tone="neutral">Terminée</StatusBadge>
                ) : (
                  <StatusBadge tone="info">À venir</StatusBadge>
                )}
              </div>
              <div className="mt-5">
                <StackedBar
                  total={s.total}
                  segments={[
                    { key: "inRoom", label: "En salle", value: s.counts.inRoom, color: COLORS.inRoom },
                    { key: "out", label: "Sortis", value: s.counts.out, color: COLORS.out },
                    { key: "ended", label: "Copie remise", value: s.counts.ended, color: COLORS.ended },
                    { key: "fraud", label: "Fraude", value: s.counts.fraud, color: COLORS.fraud },
                    {
                      key: "absent",
                      label: s.exam.startsAt <= now ? "Absents" : "Pas encore arrivés",
                      value: s.counts.absent + s.counts.waiting,
                      color: COLORS.absent,
                    },
                  ]}
                />
              </div>
              <DataTable className="mt-4 rounded-xl border border-line">
                <thead>
                  <tr>
                    <th>Salle</th>
                    <th>Présents</th>
                    <th>Sortis</th>
                    <th>Copies</th>
                    <th>Fraudes</th>
                  </tr>
                </thead>
                <tbody>
                  {s.rooms.map((r) => (
                    <tr key={r.label}>
                      <td className="min-w-48 font-semibold">{r.label}</td>
                      <td className="tabular-nums">
                        {r.inRoom + r.out + r.ended + r.fraud}/{r.total}
                      </td>
                      <td className="tabular-nums">{r.out}</td>
                      <td className="tabular-nums">{r.ended}</td>
                      <td className={`tabular-nums ${r.fraud ? "font-bold text-danger" : ""}`}>{r.fraud}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </section>
          ))}
        </div>
      )}

      <Card title="Incidents et sorties" className="mt-6" padded={false}>
        {incidents.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="Aucun incident signalé"
            description="Sorties temporaires et fraudes apparaîtront ici dès leur scan."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Heure</th>
                <th>Candidat</th>
                <th>Événement</th>
                <th>Surveillant</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((s, i) => (
                <tr key={i}>
                  <td className="tabular-nums">{formatTime(s.at)}</td>
                  <td>
                    {s.name} · <Mono>{s.matricule}</Mono>
                  </td>
                  <td>
                    {s.type === "fraud" ? (
                      <StatusBadge tone="danger" icon={ShieldAlert}>
                        Fraude{s.comment ? ` : ${s.comment}` : ""}
                      </StatusBadge>
                    ) : (
                      <StatusBadge tone="warning">Sortie temporaire</StatusBadge>
                    )}
                  </td>
                  <td className="text-muted">{s.by}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
