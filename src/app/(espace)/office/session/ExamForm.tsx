"use client";

import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { buttonClass } from "@/components/app/ui";
import { saveExam } from "./actions";

export function ExamForm({
  serieCode,
  subjects,
  exam,
  onDone,
}: {
  serieCode: string;
  subjects: { id: number; name: string }[];
  exam?: { id: number; subjectId: number; startsAt: string; endsAt: string };
  onDone: () => void;
}) {
  return (
    <ActionForm action={saveExam} onSuccess={onDone} className="space-y-4">
      <input type="hidden" name="serieCode" value={serieCode} />
      {exam && <input type="hidden" name="id" value={exam.id} />}
      <label className="block">
        <span className="text-sm font-semibold">Matière</span>
        <select name="subjectId" defaultValue={exam?.subjectId ?? ""} required className="field-input mt-1.5">
          <option value="" disabled>
            Choisir…
          </option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <FieldError name="subjectId" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Début (heure de Madagascar)</span>
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={exam?.startsAt}
            required
            className="field-input mt-1.5"
          />
          <FieldError name="startsAt" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Fin</span>
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={exam?.endsAt}
            required
            className="field-input mt-1.5"
          />
          <FieldError name="endsAt" />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className={buttonClass("ghost")}>
          Annuler
        </button>
        <SubmitButton className={buttonClass("primary")}>
          {exam ? "Enregistrer" : "Ajouter l'épreuve"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
