"use client";

import { Plus } from "lucide-react";
import { FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ActionForm } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { buttonClass } from "@/components/app/ui";
import { createCourse, updateCourse } from "./actions";

type Subject = { id: number; name: string };
type Serie = { code: string; name: string };

export type CourseDraft = {
  id: number;
  title: string;
  subjectId: number;
  serieCode: string | null;
  description: string;
  format: "presentiel" | "en_ligne" | "mixte";
  priceAriary: number;
  capacity: number | null;
};

function CourseFields({
  subjects,
  series,
  course,
}: {
  subjects: Subject[];
  series: Serie[];
  course?: CourseDraft;
}) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-semibold">Titre du cours</span>
        <input name="title" required defaultValue={course?.title} className="field-input mt-1.5" />
        <FieldError name="title" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Matière</span>
          <select
            name="subjectId"
            required
            defaultValue={course?.subjectId ?? ""}
            className="field-input mt-1.5"
          >
            <option value="" disabled>
              Choisir une matière
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <FieldError name="subjectId" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Série visée</span>
          <select name="serieCode" defaultValue={course?.serieCode ?? ""} className="field-input mt-1.5">
            <option value="">Toutes les séries</option>
            {series.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
          <FieldError name="serieCode" />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Description</span>
        <textarea
          name="description"
          rows={4}
          required
          defaultValue={course?.description}
          placeholder="Objectifs, prérequis, déroulement, modalités d'évaluation…"
          className="field-input mt-1.5"
        />
        <FieldError name="description" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-semibold">Format</span>
          <select name="format" defaultValue={course?.format ?? "presentiel"} className="field-input mt-1.5">
            <option value="presentiel">Présentiel</option>
            <option value="en_ligne">En ligne</option>
            <option value="mixte">Mixte</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Prix (Ariary)</span>
          <input
            name="priceAriary"
            type="number"
            min={0}
            step={1000}
            defaultValue={course?.priceAriary ?? 0}
            className="field-input mt-1.5"
          />
          <p className="mt-1 text-xs text-muted">0 = gratuit.</p>
          <FieldError name="priceAriary" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Places</span>
          <input
            name="capacity"
            type="number"
            min={1}
            max={500}
            defaultValue={course?.capacity ?? ""}
            placeholder="Illimité"
            className="field-input mt-1.5"
          />
          <p className="mt-1 text-xs text-muted">Vide = sans limite.</p>
          <FieldError name="capacity" />
        </label>
      </div>
    </>
  );
}

/** Création d'un cours : il démarre en brouillon, invisible des candidat·es. */
export function CourseCreate({ subjects, series }: { subjects: Subject[]; series: Serie[] }) {
  return (
    <ModalButton label="Publier un cours" title="Nouveau cours" icon={<Plus className="size-5" />}>
      {(close) => (
        <ActionForm action={createCourse} onSuccess={close} className="space-y-4">
          <CourseFields subjects={subjects} series={series} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton className={buttonClass("primary")}>Enregistrer le brouillon</SubmitButton>
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

/** Modification d'un cours existant. */
export function CourseEdit({
  course,
  subjects,
  series,
}: {
  course: CourseDraft;
  subjects: Subject[];
  series: Serie[];
}) {
  return (
    <ModalButton label="Modifier" title={`Modifier · ${course.title}`} variant="secondary" size="sm">
      {(close) => (
        <ActionForm action={updateCourse} onSuccess={close} className="space-y-4">
          <input type="hidden" name="id" value={course.id} />
          <CourseFields subjects={subjects} series={series} course={course} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton className={buttonClass("primary")}>Enregistrer</SubmitButton>
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}
