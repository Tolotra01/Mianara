"use client";

import { Save } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { buttonClass } from "@/components/app/ui";
import { PHONE_INPUT } from "@/lib/phone";
import { SubjectPicker } from "../../admin/enseignants/TeacherDialogs";
import { saveTeacherProfile } from "./actions";

type Subject = { id: number; name: string };

/** Profil public de l'enseignant : présentation, ville et matières déclarées. */
export function ProfileForm({
  subjects,
  values,
}: {
  subjects: Subject[];
  values: { city: string; phone: string; bio: string; yearsExperience: number; subjectIds: number[] };
}) {
  return (
    <ActionForm action={saveTeacherProfile} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Ville</span>
          <input name="city" defaultValue={values.city} className="field-input mt-1.5" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Téléphone</span>
          <input
            name="phone"
            defaultValue={values.phone}
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
          defaultValue={values.yearsExperience}
          className="field-input mt-1.5"
        />
        <FieldError name="yearsExperience" />
      </label>
      <SubjectPicker subjects={subjects} selected={values.subjectIds} />
      <label className="block">
        <span className="text-sm font-semibold">Présentation</span>
        <textarea
          name="bio"
          rows={5}
          defaultValue={values.bio}
          placeholder="Parcours, pédagogie, préparation aux épreuves du Bacc…"
          className="field-input mt-1.5"
        />
        <FieldError name="bio" />
      </label>
      <SubmitButton className={buttonClass("primary")}>
        <Save className="size-4" /> Enregistrer mon profil
      </SubmitButton>
    </ActionForm>
  );
}
