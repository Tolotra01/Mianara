import { desc, eq } from "drizzle-orm";
import { Newspaper } from "lucide-react";
import { proposeNews } from "@/app/actions/news";
import { requireDb } from "@/db";
import { news } from "@/db/schema";
import { formatDateTime } from "@/lib/bac-rules";
import { NewsDialog } from "./NewsDialog";
import { Card, DataTable, EmptyState, PageHeader, StatusBadge } from "./ui";

const STATUS = {
  pending: { label: "En attente de l'Admin", tone: "warning" },
  approved: { label: "Publiée", tone: "success" },
  rejected: { label: "Non retenue", tone: "danger" },
} as const;

/** Propositions d'actualités d'un Office ou d'une école, et leur suivi. */
export async function ProposalsPage({ userId }: { userId: string }) {
  const list = await requireDb()
    .select()
    .from(news)
    .where(eq(news.proposedBy, userId))
    .orderBy(desc(news.createdAt));
  return (
    <>
      <PageHeader
        title="Proposer une actualité"
        description="Rédigez une information pour les candidats (inscriptions, dates, consignes). L'Administration décide de sa publication sur Mianara."
        actions={<NewsDialog action={proposeNews} proposal />}
      />
      <Card padded={false}>
        {list.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Aucune proposition"
            description="Vos propositions et leur statut apparaîtront ici."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Envoyée le</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {list.map((n) => {
                const st = STATUS[(n.reviewStatus ?? "pending") as keyof typeof STATUS];
                return (
                  <tr key={n.id}>
                    <td className="max-w-lg">
                      <span className="font-bold">{n.title}</span>
                      {n.reviewNote && <span className="block text-xs text-danger">{n.reviewNote}</span>}
                    </td>
                    <td className="whitespace-nowrap text-muted">{formatDateTime(n.createdAt)}</td>
                    <td>
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
