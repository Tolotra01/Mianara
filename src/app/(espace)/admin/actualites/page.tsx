import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Archive, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Card, DataTable, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { news } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/bac-rules";
import { archiveNews } from "../actions";
import { NewsDialog } from "./NewsDialog";

export const metadata: Metadata = { title: "Actualités" };

export default async function ActualitesAdmin() {
  await requireUser(["admin"]);
  const list = await requireDb().select().from(news).orderBy(desc(news.createdAt));
  return (
    <>
      <PageHeader
        title="Actualités"
        description="Publiées sur la page Actualités du site public et lues par l'assistant IA."
        actions={<NewsDialog />}
      />
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
                <td>{n.category}</td>
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
                  <NewsDialog item={{ ...n, publishedAt: n.publishedAt?.toISOString() ?? null }} />
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
