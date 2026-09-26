import type { Metadata } from "next";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Ban, ShieldOff } from "lucide-react";
import Link from "next/link";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Card, DataTable, EmptyState, Mono, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { blacklist, candidates, users } from "@/db/schema-gestion";
import { requireOffice } from "@/lib/auth";
import { formatDate } from "@/lib/bac-rules";
import { liftBlacklist } from "./actions";

export const metadata: Metadata = { title: "Liste noire" };

export default async function ListeNoirePage() {
  const user = await requireOffice();
  const rows = await requireDb()
    .select({ b: blacklist, c: candidates, by: users.fullName })
    .from(blacklist)
    .innerJoin(candidates, eq(candidates.id, blacklist.candidateId))
    .innerJoin(users, eq(users.id, blacklist.addedBy))
    .where(and(eq(candidates.officeId, user.officeId), isNull(blacklist.liftedAt)))
    .orderBy(desc(blacklist.createdAt));

  return (
    <>
      <PageHeader
        title="Liste noire"
        description="Les candidats inscrits ne peuvent demander ni relevé ni diplôme. On inscrit un candidat depuis sa fiche."
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState
            icon={Ban}
            title="Aucun candidat en liste noire"
            description="Utilisez le bouton « Liste noire » de la fiche d'un candidat."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Motif</th>
                <th>Période</th>
                <th>Par</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, c, by }) => {
                const expired = b.endsAt && b.endsAt < new Date().toISOString().slice(0, 10);
                return (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/office/candidats/${c.id}`} className="font-bold hover:text-vert">
                        {c.lastName} {c.firstName}
                      </Link>
                      <div className="text-xs">
                        <Mono>{c.matricule}</Mono>
                      </div>
                    </td>
                    <td className="max-w-sm">{b.reason}</td>
                    <td className="whitespace-nowrap">
                      {formatDate(b.startsAt)} → {b.endsAt ? formatDate(b.endsAt) : "définitif"}
                      {expired && (
                        <div className="mt-1">
                          <StatusBadge tone="neutral">Expirée</StatusBadge>
                        </div>
                      )}
                    </td>
                    <td className="text-muted">{by}</td>
                    <td className="text-right">
                      <ConfirmAction
                        action={liftBlacklist}
                        fields={{ id: String(b.id) }}
                        variant="secondary"
                        size="sm"
                        icon={<ShieldOff className="size-4" />}
                        label="Lever"
                        title="Lever la mesure ?"
                        description="Le candidat pourra de nouveau demander ses documents."
                      />
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
