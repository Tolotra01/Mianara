import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Archive, CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Card, DataTable, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { news } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/bac-rules";
import { archiveNews, saveNews } from "../actions";
import { NewsDialog } from "@/components/app/NewsDialog";
import { reviewNews } from "@/app/actions/news";

export const metadata: Metadata = { title: "Actualités" };

export default async function ActualitesAdmin() {
  await requireUser(["admin"]);
  const all = await requireDb().select().from(news).orderBy(desc(news.createdAt));
  const pending = all.filter((n) => n.reviewStatus === "pending");
  const list = all.filter((n) => n.reviewStatus !== "pending" && n.reviewStatus !== "rejected");
  return (
    <>
      <PageHeader
        title="Actualités"
        description="Publiées sur la page Actualités du site public et lues par l'assistant IA."
        actions={<NewsDialog action={saveNews} />}
      />
      {pending.length > 0 && (
        <Card
          title={`Propositions à valider (${pending.length})`}
          description="Envoyées par les Offices et les écoles."
          className="mb-6"
        >
          <ul className="space-y-4">
            {pending.map((n) => (
              <li key={n.id} className="anim-fade rounded-2xl border border-soleil bg-soleil-soft/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted uppercase">
                      {n.proposedByLabel} · {formatDateTime(n.createdAt)}
                    </p>
                    <p className="t-h3 mt-1">{n.title}</p>
                    <p className="mt-1 text-sm">{n.excerpt}</p>
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer font-semibold text-vert">Lire le texte</summary>
                      <p className="mt-2 whitespace-pre-line text-muted">{n.body}</p>
                    </details>
                  </div>
                  <div className="flex gap-2">
                    <ConfirmAction
                      action={reviewNews}
                      fields={{ id: String(n.id), decision: "approve" }}
                      size="sm"
                      icon={<CheckCircle2 className="size-4" />}
                      label="Publier"
                      title="Publier cette actualité ?"
                      description="Elle apparaîtra aussitôt dans les actualités du site public."
                      confirmLabel="Publier"
                    />
                    <ConfirmAction
                      action={reviewNews}
                      fields={{ id: String(n.id), decision: "reject" }}
                      variant="secondary"
                      size="sm"
                      icon={<XCircle className="size-4" />}
                      label="Refuser"
                      title="Refuser cette proposition ?"
                      confirmLabel="Refuser"
                    >
                      <label className="block">
                        <span className="text-sm font-semibold">Motif (transmis à l&apos;auteur)</span>
                        <textarea name="note" required rows={3} className="field-input mt-1.5" />
                      </label>
                    </ConfirmAction>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card padded={false}>
        <DataTable>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Catégorie</th>
              <th>Statut</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id}>
                <td className="max-w-md">
                  <span className="font-bold">{n.title}</span>
                  <span className="block truncate text-xs text-muted">{n.excerpt}</span>
                </td>
                <td>
                  {n.category}
                  {n.proposedByLabel && (
                    <span className="block text-xs text-muted">Proposée par {n.proposedByLabel}</span>
                  )}
                </td>
                <td>
                  {n.archivedAt ? (
                    <StatusBadge tone="neutral">Archivée</StatusBadge>
                  ) : n.publishedAt ? (
                    <StatusBadge tone="success">En ligne</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">Brouillon</StatusBadge>
                  )}
                </td>
                <td className="whitespace-nowrap text-muted">
                  {n.publishedAt ? formatDate(n.publishedAt) : "—"}
                </td>
                <td className="text-right whitespace-nowrap">
                  {n.publishedAt && !n.archivedAt && (
                    <Link
                      href={`/actualites/${n.slug}`}
                      target="_blank"
                      className="inline-grid size-9 place-items-center rounded-lg text-muted hover:bg-sunken hover:text-vert"
                      aria-label="Voir sur le site"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  )}
                  <NewsDialog
                    action={saveNews}
                    item={{ ...n, publishedAt: n.publishedAt?.toISOString() ?? null }}
                  />
                  <ConfirmAction
                    action={archiveNews}
                    fields={{ id: String(n.id) }}
                    variant="ghost"
                    size="sm"
                    icon={<Archive className="size-4" />}
                    label={<span className="sr-only">{n.archivedAt ? "Restaurer" : "Archiver"}</span>}
                    title={n.archivedAt ? "Restaurer cette actualité ?" : "Archiver cette actualité ?"}
                    description={n.archivedAt ? undefined : "Elle sera retirée du site public."}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>
    </>
  );
}
