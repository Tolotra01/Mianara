import type { Metadata } from "next";
import { and, count, eq, sql } from "drizzle-orm";
import { BookOpen, MessagesSquare, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { Alert, Card, EmptyState, LinkButton, PageHeader, StatCard, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { learningItems, learningPayments } from "@/db/schema-learning";
import { requireUser } from "@/lib/auth";
import { formatAriary, formatDateTime } from "@/lib/bac-rules";
import { teacherProfile, teacherSessions } from "@/lib/services/learning";

export const metadata: Metadata = { title: "Espace enseignant" };

export default async function EnseignantHome() {
  const user = await requireUser(["teacher"]);
  const db = requireDb();
  const [profile, sessions, [published], [pending], [revenue]] = await Promise.all([
    teacherProfile(user.id),
    teacherSessions(user.id),
    db
      .select({ n: count() })
      .from(learningItems)
      .where(and(eq(learningItems.authorId, user.id), eq(learningItems.status, "approved"))),
    db
      .select({ n: count() })
      .from(learningItems)
      .where(and(eq(learningItems.authorId, user.id), eq(learningItems.status, "submitted"))),
    db
      .select({ total: sql<number>`coalesce(sum(${learningPayments.amount}), 0)::int` })
      .from(learningPayments)
      .innerJoin(learningItems, eq(learningItems.id, learningPayments.itemId))
      .where(and(eq(learningItems.authorId, user.id), eq(learningPayments.status, "approved"))),
  ]);
  const active = sessions.filter((s) => s.status === "active");
  const unread = sessions.reduce((n, s) => n + s.unread, 0);

  return (
    <>
      <PageHeader
        eyebrow={profile ? `Enseignant · ${profile.subjectName}` : "Enseignant"}
        title={`Bonjour, ${user.fullName.split(" ")[0]}`}
        description="Publiez vos cours et exercices pour l'application Mianara Mobile, et accompagnez vos élèves en tutorat."
        actions={<LinkButton href="/enseignant/contenus">Mes contenus</LinkButton>}
      />
      {unread > 0 && (
        <div className="mb-6">
          <Alert tone="info" title={`${unread} message(s) d'élèves non lu(s)`}>
            <Link href="/enseignant/tutorat" className="font-semibold underline">
              Ouvrir le tutorat
            </Link>
          </Alert>
        </div>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Contenus publiés" value={published.n} icon={BookOpen} href="/enseignant/contenus" />
        <StatCard label="En validation" value={pending.n} icon={Send} tone="info" />
        <StatCard
          label="Tutorats actifs"
          value={active.length}
          icon={MessagesSquare}
          tone="soleil"
          href="/enseignant/tutorat"
        />
        <StatCard label="Ventes validées" value={formatAriary(revenue.total)} icon={Wallet} tone="mena" />
      </div>
      <Card title="Séances de tutorat en cours">
        {active.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Aucune séance en cours"
            description="Publiez une offre de tutorat : les élèves la réservent depuis l'application."
          />
        ) : (
          <ul className="divide-y divide-line">
            {active.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/enseignant/tutorat/${s.id}`}
                  className="flex items-center gap-3 py-3 hover:text-vert"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-bold">{s.pupil}</span>
                    <span className="block truncate text-sm text-muted">{s.lastText ?? s.title}</span>
                  </span>
                  {s.unread > 0 && <StatusBadge tone="info">{s.unread} nouveau(x)</StatusBadge>}
                  {s.lastAt && <span className="text-xs text-muted">{formatDateTime(s.lastAt)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
