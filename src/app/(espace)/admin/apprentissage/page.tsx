import type { Metadata } from "next";
import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Archive, BookOpen, Check, Wallet, X } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Alert, Card, DataTable, EmptyState, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { users } from "@/db/schema-gestion";
import { learningItems } from "@/db/schema-learning";
import { requireUser } from "@/lib/auth";
import { KindTag } from "@/components/app/KindTag";
import { formatAriary, formatDateTime } from "@/lib/bac-rules";
import { getSetting, KIND_LABEL, MERCHANT_KEY } from "@/lib/services/learning";
import { archiveItemAdmin, reviewItem } from "./actions";
import { MerchantForm } from "./LearningForms";

export const metadata: Metadata = { title: "Contenus à valider" };

export default async function ApprentissageAdminPage() {
  await requireUser(["admin"]);
  const db = requireDb();
  const author = alias(users, "author");
  const select = {
    i: learningItems,
    subject: subjects.name,
    author: author.fullName,
    sales: sql<number>`(select count(*)::int from learning_payments p where p.item_id = ${learningItems.id} and p.status = 'approved')`,
  };
  const [pending, published, merchant] = await Promise.all([
    db
      .select(select)
      .from(learningItems)
      .innerJoin(subjects, eq(subjects.id, learningItems.subjectId))
      .innerJoin(author, eq(author.id, learningItems.authorId))
      .where(eq(learningItems.status, "submitted"))
      .orderBy(learningItems.updatedAt),
    db
      .select(select)
      .from(learningItems)
      .innerJoin(subjects, eq(subjects.id, learningItems.subjectId))
      .innerJoin(author, eq(author.id, learningItems.authorId))
      .where(and(eq(learningItems.status, "approved")))
      .orderBy(desc(learningItems.reviewedAt)),
    getSetting(MERCHANT_KEY),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Apprentissage"
        title="Contenus à valider"
        description="Cours, exercices et offres de tutorat proposés par les enseignants. Rien n'apparaît dans l'application Mianara Mobile sans votre validation."
      />

      <Card title="Paiements dans l'application" className="mb-6">
        {!merchant && (
          <div className="mb-4">
            <Alert tone="warning" title="Paiements fermés">
              Tant qu&apos;aucun numéro marchand n&apos;est enregistré, les candidats ne peuvent pas acheter
              de contenu payant ni réserver un tutorat.
            </Alert>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-soleil-soft text-warning">
            <Wallet className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <MerchantForm value={merchant} />
          </div>
        </div>
      </Card>

      <Card title={`En attente de validation (${pending.length})`} className="mb-6">
        {pending.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Aucun contenu en attente"
            description="Les propositions des enseignants s'affichent ici."
          />
        ) : (
          <ul className="space-y-4">
            {pending.map(({ i, subject, author: who }) => (
              <li key={i.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <KindTag kind={i.kind} />
                      <span className="text-sm font-semibold text-muted">
                        {subject} · {who} · {i.priceAmount ? formatAriary(i.priceAmount) : "Gratuit"}
                        {i.durationMinutes ? ` · ${i.durationMinutes} min` : ""}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-bold">{i.title}</h3>
                    <p className="mt-1 text-muted">{i.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <ConfirmAction
                      action={reviewItem}
                      fields={{ id: i.id, decision: "approve" }}
                      label="Publier"
                      icon={<Check className="size-4" />}
                      size="sm"
                      title={`Publier « ${i.title} » ?`}
                      description="Le contenu devient visible dans l'application pour les candidats des séries concernées."
                    />
                    <ConfirmAction
                      action={reviewItem}
                      fields={{ id: i.id, decision: "reject" }}
                      label="Refuser"
                      variant="danger"
                      size="sm"
                      icon={<X className="size-4" />}
                      title="Refuser ce contenu ?"
                      description="L'enseignant reçoit le motif et peut corriger puis renvoyer."
                    >
                      <label className="block">
                        <span className="text-sm font-semibold">Motif</span>
                        <textarea name="note" required rows={3} className="field-input mt-1.5" />
                      </label>
                    </ConfirmAction>
                  </div>
                </div>
                {i.content && (
                  <details className="mt-3 rounded-lg bg-sunken p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">Lire le contenu</summary>
                    <div className="mt-2 whitespace-pre-wrap">{i.content}</div>
                  </details>
                )}
                <p className="mt-2 text-xs text-muted">Envoyé le {formatDateTime(i.updatedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Catalogue publié (${published.length})`} padded={false}>
        {published.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Catalogue vide"
            description="Les contenus validés apparaîtront ici."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Contenu</th>
                <th>Matière</th>
                <th>Enseignant</th>
                <th>Prix</th>
                <th>Ventes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {published.map(({ i, subject, author: who, sales }) => (
                <tr key={i.id}>
                  <td>
                    <span className="font-bold">{i.title}</span>
                    <span className="block text-xs text-muted">{KIND_LABEL[i.kind]}</span>
                  </td>
                  <td>{subject}</td>
                  <td>{who}</td>
                  <td className="tabular-nums">{i.priceAmount ? formatAriary(i.priceAmount) : "Gratuit"}</td>
                  <td className="tabular-nums">{sales}</td>
                  <td className="text-right">
                    <ConfirmAction
                      action={archiveItemAdmin}
                      fields={{ id: i.id }}
                      variant="ghost"
                      size="sm"
                      icon={<Archive className="size-4" />}
                      label={<span className="sr-only">Retirer</span>}
                      title={`Retirer « ${i.title} » du catalogue ?`}
                      description="Les candidats qui l'ont acheté gardent leur copie hors ligne ; il n'est plus proposé."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
