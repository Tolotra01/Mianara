"use client";

import { Pencil } from "lucide-react";
import { FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ActionForm } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { buttonClass } from "@/components/app/ui";
import { PHONE_INPUT } from "@/lib/phone";
import { updateTeacher } from "./actions";
import { SubjectPicker } from "./TeacherDialogs";

type Teacher = {
  userId: string;
  fullName: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  yearsExperience: number;
  subjectIds: number[];
};

type Subject = { id: number; name: string };

/** Fiche détaillée gérée par l'Administration : matières déclarées, ville, expérience. */
export function TeacherEdit({ teacher, subjects }: { teacher: Teacher; subjects: Subject[] }) {
  return (
    <ModalButton
      label={<span className="sr-only">Modifier</span>}
      title={`Modifier · ${teacher.fullName}`}
      variant="ghost"
      size="sm"
      icon={<Pencil className="size-4" aria-hidden />}
    >
      {(close) => (
        <ActionForm action={updateTeacher} onSuccess={close} className="space-y-4">
          <input type="hidden" name="id" value={teacher.userId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Ville</span>
              <input name="city" defaultValue={teacher.city ?? ""} className="field-input mt-1.5" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Téléphone</span>
              <input
                name="phone"
                defaultValue={teacher.phone ?? ""}
                className="field-input mt-1.5"
                placeholder="034 00 000 00"
                {...PHONE_INPUT}
              />
              <FieldError name="phone" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Années d&apos;expérience</span>
            <input
              name="yearsExperience"
              type="number"
              min={0}
              max={60}
              defaultValue={teacher.yearsExperience}
              className="field-input mt-1.5"
            />
            <FieldError name="yearsExperience" />
          </label>
          <SubjectPicker
            subjects={subjects}
            selected={teacher.subjectIds}
            error={undefined}
          />
          <label className="block">
            <span className="text-sm font-semibold">Présentation</span>
            <textarea name="bio" rows={4} defaultValue={teacher.bio ?? ""} className="field-input mt-1.5" />
          </label>
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
