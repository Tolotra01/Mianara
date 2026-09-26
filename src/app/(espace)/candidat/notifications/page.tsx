import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Button, Card, EmptyState, PageHeader } from "@/components/app/ui";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import { requireDb } from "@/db";
import { notifications } from "@/db/schema-gestion";
import { requireCandidate } from "@/lib/auth";
import { formatDateTime } from "@/lib/bac-rules";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { user } = await requireCandidate();
  const list = await requireDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  const unread = list.filter((n) => !n.readAt).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Convocation, emploi du temps, résultats, demandes : tout ce qui concerne votre dossier."
        actions={
          unread > 0 && (
            <form action={markAllNotificationsRead}>
              <Button variant="secondary" type="submit">
                <CheckCheck className="size-5" /> Tout marquer comme lu
              </Button>
            </form>
          )
        }
      />
      <Card padded={false}>
        {list.length === 0 ? (
          <EmptyState icon={Bell} title="Aucune notification" />
        ) : (
          <ul className="stagger divide-y divide-line">
            {list.map((n, i) => (
              <li key={n.id} style={{ "--i": Math.min(i, 12) } as React.CSSProperties}>
                <Link
                  href={n.link ?? "#"}
                  className={`flex gap-4 px-5 py-4 transition-colors hover:bg-sunken ${n.readAt ? "" : "bg-vert-soft/40"}`}
                >
                  <span
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.readAt ? "bg-line" : "bg-mena"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{n.title}</span>
                    <span className="block text-muted">{n.body}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted">{formatDateTime(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
