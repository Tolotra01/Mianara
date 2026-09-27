import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/app/AutoRefresh";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";
import { teacherSessions } from "@/lib/services/learning";

export const metadata: Metadata = { title: "Tutorat" };

export default async function TutoratPage() {
  const user = await requireUser(["teacher"]);
  const sessions = await teacherSessions(user.id);
  return (
    <>
      <PageHeader
        title="Tutorat"
        description="Vos séances avec les élèves. Pour préserver l'anonymat, chaque élève apparaît sous un pseudonyme."
        actions={<AutoRefresh seconds={15} />}
      />
      <Card padded={false}>
        {sessions.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="Aucune séance"
            description="Une séance s'ouvre quand l'Administration valide le paiement d'un élève."
          />
        ) : (
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/enseignant/tutorat/${s.id}`}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sunken ${s.status === "closed" ? "opacity-60" : ""}`}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-vert-soft font-bold text-vert">
                    {s.pupil.slice(-2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-bold">{s.pupil}</span>
                    <span className="block truncate text-sm text-muted">
                      {s.lastText ?? `Séance « ${s.title} » ouverte`}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {s.unread > 0 ? (
                      <StatusBadge tone="info">{s.unread} non lu(s)</StatusBadge>
                    ) : (
                      <StatusBadge tone={s.status === "active" ? "success" : "neutral"}>
                        {s.status === "active" ? "En cours" : "Terminée"}
                      </StatusBadge>
                    )}
                    <span className="text-xs text-muted">
                      {formatDateTime(s.lastAt ?? s.activatedAt ?? s.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
