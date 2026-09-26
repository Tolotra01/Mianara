import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Undo2 } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Alert, buttonClass, Card, PageHeader } from "@/components/app/ui";
import { requireDb } from "@/db";
import { examSessions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDateTime, toLocalInput } from "@/lib/bac-rules";
import { saveSession, unpublishResults } from "../actions";

export const metadata: Metadata = { title: "Paramètres de session" };

function Input({
  name,
  label,
  hint,
  ...props
}: React.ComponentProps<"input"> & { name: string; label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input name={name} className="field-input mt-1.5" {...props} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      <FieldError name={name} />
    </label>
  );
}

export default async function SessionPage() {
  await requireUser(["admin"]);
  const [s] = await requireDb().select().from(examSessions).where(eq(examSessions.isCurrent, true));
  if (!s) return <Alert tone="warning" title="Aucune session en cours" />;
  const published = Boolean(s.resultsPublishAt && s.resultsPublishAt <= new Date());

  return (
    <>
      <PageHeader
        title={`Session ${s.year}`}
        description="Dates clés, règles de délibération et tarifs des documents (ADM-05)."
      />
      {published && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-raised p-5 shadow-sm">
          <Alert tone="success" title={`Résultats publiés le ${formatDateTime(s.resultsPublishAt!)}`}>
            Les notes sont verrouillées dans tous les Offices.
          </Alert>
          <ConfirmAction
            action={unpublishResults}
            fields={{ id: String(s.id) }}
            variant="danger"
            icon={<Undo2 className="size-5" />}
            label="Annuler la publication"
            title="Retirer les résultats publiés ?"
            description="Les candidats ne verront plus leurs résultats et les Offices pourront de nouveau modifier les notes. Action tracée."
            confirmLabel="Retirer"
          />
        </div>
      )}
      <Card>
        <ActionForm action={saveSession} className="space-y-8">
          <input type="hidden" name="id" value={s.id} />
          <fieldset className="grid gap-4 md:grid-cols-3">
            <legend className="t-overline mb-3 text-muted">Calendrier</legend>
            <Input
              name="examsStart"
              label="Début des épreuves"
              type="date"
              defaultValue={s.examsStart ?? ""}
            />
            <Input name="examsEnd" label="Fin des épreuves" type="date" defaultValue={s.examsEnd ?? ""} />
            <Input
              name="resultsPublishAt"
              label="Publication des résultats"
              type="datetime-local"
              defaultValue={toLocalInput(s.resultsPublishAt)}
              hint="Heure de Madagascar. Vide : non programmée."
            />
          </fieldset>
          <fieldset className="grid gap-4 md:grid-cols-3">
            <legend className="t-overline mb-3 text-muted">Règles</legend>
            <Input
              name="admissionThreshold"
              label="Seuil d'admission (/20)"
              type="number"
              step="0.25"
              min="9.5"
              max="10"
              defaultValue={s.admissionThreshold}
              hint="10 par défaut, 9,50 au minimum."
            />
            <Input
              name="transcriptDelayDays"
              label="Ouverture des demandes de relevé (jours)"
              type="number"
              min="0"
              defaultValue={s.transcriptDelayDays}
              hint="J+7 dans le cahier des charges."
            />
            <Input
              name="accountDisableDays"
              label="Désactivation des comptes ajournés (jours)"
              type="number"
              min="7"
              defaultValue={s.accountDisableDays}
            />
          </fieldset>
          <fieldset className="grid gap-4 md:grid-cols-3">
            <legend className="t-overline mb-3 text-muted">Tarifs (Ariary)</legend>
            <Input
              name="transcriptFee"
              label="Relevé de notes"
              type="number"
              min="0"
              step="500"
              defaultValue={s.transcriptFee}
            />
            <Input
              name="diplomaFee"
              label="Diplôme"
              type="number"
              min="0"
              step="500"
              defaultValue={s.diplomaFee}
            />
          </fieldset>
          <div className="flex items-center gap-3 border-t border-line pt-5">
            <SubmitButton className={buttonClass("primary")}>Enregistrer les paramètres</SubmitButton>
            <p className="text-sm text-muted">
              Tarifs à confirmer avec le règlement de l&apos;Office du Bac.
            </p>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
