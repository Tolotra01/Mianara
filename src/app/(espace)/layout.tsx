import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationBell } from "@/components/app/NotificationBell";
import { Sidebar } from "@/components/app/Sidebar";
import { Toaster } from "@/components/app/Toaster";
import { requireDb } from "@/db";
import { examSessions } from "@/db/schema";
import { candidates, documentRequests, notifications } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const db = requireDb();

  const [recent, [{ unread }], [session], pending] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(8),
    db
      .select({ unread: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
    db
      .select({ year: examSessions.year })
      .from(examSessions)
      .where(eq(examSessions.isCurrent, true))
      .limit(1),
    user.role === "office" && user.officeId
      ? db
          .select({ n: count() })
          .from(documentRequests)
          .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
          .where(
            and(
              eq(candidates.officeId, user.officeId),
              inArray(documentRequests.status, ["pending", "validated"]),
            ),
          )
      : Promise.resolve([{ n: 0 }]),
  ]);

  const notifHref = user.role === "candidate" ? "/candidat/notifications" : "/compte";
  const subtitle = user.role === "candidate" ? `Session ${session?.year ?? ""}` : user.officeName;

  return (
    <Toaster>
      <div className="min-h-dvh bg-surface">
        <Sidebar
          role={user.role}
          user={{ fullName: user.fullName, username: user.username, subtitle }}
          badges={{ requests: pending[0]?.n ?? 0, notifications: unread }}
        />
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-2 border-b border-line bg-surface/85 px-4 backdrop-blur sm:px-8">
            {session && (
              <span className="mr-auto ml-12 hidden items-center gap-2 rounded-full border border-line bg-raised px-3 py-1 text-sm font-semibold sm:inline-flex lg:ml-0">
                <span className="size-2 rounded-full bg-soleil" aria-hidden />
                Session du Bac {session.year}
              </span>
            )}
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:bg-sunken hover:text-ink sm:inline-flex"
            >
              Site public <ExternalLink className="size-3.5" aria-hidden />
            </Link>
            <NotificationBell
              unread={unread}
              allHref={notifHref}
              items={recent.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                link: n.link,
                read: Boolean(n.readAt),
                createdAt: formatDateTime(n.createdAt),
              }))}
            />
          </header>
          <main id="contenu" className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-8">
            {children}
          </main>
        </div>
      </div>
    </Toaster>
  );
}
