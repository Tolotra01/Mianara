import type { Metadata } from "next";
import { and, desc, eq, ne } from "drizzle-orm";
import { Archive, BookOpen, Send } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Alert, Card, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { requireDb } from "@/db";
import { learningItems } from "@/db/schema-learning";
import { requireUser } from "@/lib/auth";
import { KindTag } from "@/components/app/KindTag";
import { formatAriary, formatDateTime } from "@/lib/bac-rules";
import { ITEM_STATUS, teacherProfile } from "@/lib/services/learning";
import { archiveItem, submitItem } from "../actions";
import { ItemDialog } from "../ItemDialog";

export const metadata: Metadata = { title: "Mes contenus" };

export default async function ContenusPage() {
  const user = await requireUser(["teacher"]);
  const [profile, items] = await Promise.all([
    teacherProfile(user.id),
    requireDb()
      .select()
      .from(learningItems)
      .where(and(eq(learningItems.authorId, user.id), ne(learningItems.status, "archived")))
      .orderBy(desc(learningItems.updatedAt)),
  ]);
  const subjectName = profile?.subjectName ?? "";
  return (
    <>
      <PageHeader
        eyebrow={`Enseignant · ${subjectName}`}
        title="Mes contenus"
        description="Chaque contenu est vérifié par l'Administration avant d'apparaître dans l'application. Les candidats voient votre matière, jamais votre nom."
        actions={<ItemDialog subjectName={subjectName} />}
      />
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Aucun contenu"
            description="Créez un cours, une série d'exercices ou une offre de tutorat."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((i) => {
            const st = ITEM_STATUS[i.status];
            const editable = i.status === "draft" || i.status === "rejected";
            return (
              <Card key={i.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <KindTag kind={i.kind} />
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    </div>
                    <h3 className="mt-2 text-lg font-bold">{i.title}</h3>
                    <p className="mt-1 text-sm text-muted">{i.description}</p>
                    <p className="mt-2 text-sm font-semibold">
                      {i.priceAmount ? formatAriary(i.priceAmount) : "Gratuit"}
                      {i.durationMinutes ? ` · ${i.durationMinutes} min` : ""}
                      <span className="font-normal text-muted">
                        {" "}
                        · modifié le {formatDateTime(i.updatedAt)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {editable && <ItemDialog item={i} subjectName={subjectName} />}
                    {i.status !== "submitted" && (
                      <ConfirmAction
                        action={archiveItem}
                        fields={{ id: i.id }}
                        variant="ghost"
                        size="sm"
                        icon={<Archive className="size-4" />}
                        label={<span className="sr-only">Archiver</span>}
                        title={`Archiver « ${i.title} » ?`}
                        description="Il ne sera plus proposé aux candidats."
                      />
                    )}
                  </div>
                </div>
                {i.status === "rejected" && i.reviewNote && (
                  <div className="mt-3">
                    <Alert tone="danger" title="Motif du refus">
                      {i.reviewNote}
                    </Alert>
                  </div>
                )}
                {editable && (
                  <div className="mt-4">
                    <ConfirmAction
                      action={submitItem}
                      fields={{ id: i.id }}
                      size="sm"
                      icon={<Send className="size-4" />}
                      label="Envoyer à la validation"
                      title="Envoyer ce contenu à l'Administration ?"
                      description="Vous ne pourrez plus le modifier pendant la vérification."
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
