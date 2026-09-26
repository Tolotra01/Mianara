import type { Metadata } from "next";
import { and, asc, count, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import {
  CalendarClock,
  Check,
  ClipboardList,
  FileStack,
  type LucideIcon,
  Megaphone,
  ScanLine,
  Ticket,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BarList } from "@/components/app/charts";
import { Card, LinkButton, PageHeader, StatCard } from "@/components/app/ui";
import { requireDb } from "@/db";
import { examSessions, series, subjects } from "@/db/schema";
import { auditLogs, candidates, documentRequests, exams, grades, users } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatDateTime, formatDay, formatTime } from "@/lib/bac-rules";
import { actionLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Office du Bac" };

export default async function OfficeDashboard() {
  const user = await requireOffice();
  const db = requireDb();
  const mine = eq(candidates.officeId, user.officeId);

  const [[session], bySerie, [placed], upcoming, requests, [graded], activity, [edt]] = await Promise.all([
    db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1),
    db
      .select({ code: series.code, name: series.name, n: count(candidates.id) })
      .from(series)
      .leftJoin(candidates, and(eq(candidates.serieCode, series.code), mine))
      .groupBy(series.code, series.name, series.sortOrder)
      .orderBy(asc(series.sortOrder)),
    db
      .select({ n: count() })
      .from(candidates)
      .where(and(mine, isNotNull(candidates.roomId))),
    db
      .select({
        id: exams.id,
        serie: exams.serieCode,
        subject: subjects.name,
        startsAt: exams.startsAt,
        endsAt: exams.endsAt,
      })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(and(gte(exams.endsAt, new Date()), eq(exams.isPublished, true)))
      .orderBy(asc(exams.startsAt))
      .limit(5),
    db
      .select({ status: documentRequests.status, n: count() })
      .from(documentRequests)
      .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
      .where(mine)
      .groupBy(documentRequests.status),
    db
      .select({ n: count() })
      .from(grades)
      .innerJoin(candidates, eq(candidates.id, grades.candidateId))
      .where(mine),
    db
      .select({ id: auditLogs.id, action: auditLogs.action, at: auditLogs.createdAt, who: users.fullName })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.actorId))
      .where(and(eq(users.officeId, user.officeId), inArray(users.role, ["office", "supervisor"])))
      .orderBy(desc(auditLogs.createdAt))
      .limit(7),
    db.select({ n: count() }).from(exams).where(eq(exams.isPublished, true)),
  ]);

  const total = bySerie.reduce((s, x) => s + x.n, 0);
  const reqCount = (s: string[]) => requests.filter((r) => s.includes(r.status)).reduce((a, r) => a + r.n, 0);
  const published = Boolean(session?.resultsPublishAt && session.resultsPublishAt <= new Date());

  const steps: { label: string; detail: string; done: boolean; href: string; icon: LucideIcon }[] = [
    {
      label: "Enregistrement",
      detail: `${total} candidat(s)`,
      done: total > 0,
      href: "/office/candidats",
      icon: UserPlus,
    },
    {
      label: "Convocations",
      detail: `${placed.n}/${total} en salle`,
      done: total > 0 && placed.n === total,
      href: "/office/centres",
      icon: Ticket,
    },
    {
      label: "Emploi du temps",
      detail: edt.n ? `${edt.n} épreuves publiées` : "À publier",
      done: edt.n > 0,
      href: "/office/session",
      icon: CalendarClock,
    },
    {
      label: "Épreuves",
      detail: "Scans des surveillants",
      done: false,
      href: "/office/epreuves",
      icon: ScanLine,
    },
    {
      label: "Notes et délibération",
      detail: `${graded.n} note(s) saisie(s)`,
      done: published,
      href: "/office/notes",
      icon: ClipboardList,
    },
    {
      label: "Publication",
      detail: published ? "Résultats publiés" : "Non publiés",
      done: published,
      href: "/office/notes",
      icon: Megaphone,
    },
    {
      label: "Demandes",
      detail: `${reqCount(["pending", "validated"])} à traiter`,
      done: false,
      href: "/office/demandes",
      icon: FileStack,
    },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <>
      <PageHeader
        eyebrow={user.officeName ?? "Office du Bac"}
        title={`Bonjour, ${user.fullName.split(" ")[0]}`}
        description={`Session ${session?.year ?? ""} : voici où en est votre Office.`}
        actions={
          <LinkButton href="/office/candidats/nouveau">
            <UserPlus className="size-5" /> Enregistrer un candidat
          </LinkButton>
        }
      />

      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div style={{ "--i": 0 } as React.CSSProperties}>
          <StatCard
            label="Candidats enregistrés"
            value={total.toLocaleString("fr-FR")}
            icon={Users}
            href="/office/candidats"
            hint="Convocation générée pour chacun"
          />
        </div>
        <div style={{ "--i": 1 } as React.CSSProperties}>
          <StatCard
            label="Placés en salle"
            value={`${total ? Math.round((placed.n / total) * 100) : 0} %`}
            icon={Ticket}
            tone="soleil"
            href="/office/centres"
            hint={`${placed.n} sur ${total}`}
          />
        </div>
        <div style={{ "--i": 2 } as React.CSSProperties}>
          <StatCard
            label="Demandes à traiter"
            value={reqCount(["pending", "validated"])}
            icon={FileStack}
            tone="mena"
            href="/office/demandes"
            hint={`${reqCount(["pickup_scheduled"])} retrait(s) fixé(s)`}
          />
        </div>
        <div style={{ "--i": 3 } as React.CSSProperties}>
          <StatCard
            label="Notes saisies"
            value={graded.n.toLocaleString("fr-FR")}
            icon={ClipboardList}
            tone="info"
            href="/office/notes"
            hint={published ? "Résultats publiés" : "Résultats non publiés"}
          />
        </div>
      </div>

      <Card title="Avancement de la session" className="mt-6">
        <ol className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
          {steps.map((s, i) => {
            const state = s.done ? "done" : i === current ? "current" : "todo";
            return (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={`group flex h-full flex-col rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    state === "current"
                      ? "border-soleil bg-soleil-soft"
                      : state === "done"
                        ? "border-line bg-vert-soft/50"
                        : "border-line bg-raised"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full ${
                        state === "done"
                          ? "bg-vert text-on-vert"
                          : state === "current"
                            ? "bg-soleil text-ink"
                            : "bg-sunken text-muted"
                      }`}
                    >
                      {state === "done" ? <Check className="size-4" /> : <s.icon className="size-4" />}
                    </span>
                    <span className="text-xs font-bold text-muted">Étape {i + 1}</span>
                  </span>
                  <span className="mt-2 text-sm font-bold group-hover:text-vert">{s.label}</span>
                  <span className="text-xs text-muted">{s.detail}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Candidats par série">
          <BarList
            items={bySerie.map((s) => ({ key: s.code, label: `Série ${s.code}`, value: s.n, hint: s.name }))}
          />
        </Card>
        <Card
          title="Prochaines épreuves"
          actions={
            <Link href="/office/session" className="text-sm font-semibold text-vert hover:underline">
              Emploi du temps
            </Link>
          }
        >
          <ul className="space-y-3">
            {upcoming.length === 0 && <li className="text-sm text-muted">Aucune épreuve à venir publiée.</li>}
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-sm font-extrabold text-vert">
                  {e.serie}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{e.subject}</span>
                  <span className="block text-sm text-muted first-letter:uppercase">
                    {formatDay(e.startsAt)} · {formatTime(e.startsAt)}–{formatTime(e.endsAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Activité récente">
          <ul className="space-y-3">
            {activity.length === 0 && <li className="text-sm text-muted">Aucune activité.</li>}
            {activity.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-vert" />
                <span>
                  <span className="font-semibold">{actionLabel(a.action)}</span>
                  <span className="block text-muted">
                    {a.who} · {formatDateTime(a.at)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
