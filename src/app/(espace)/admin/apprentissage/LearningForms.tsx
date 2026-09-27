"use client";

import { Plus } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { SecretForm } from "@/components/app/SecretForm";
import { buttonClass } from "@/components/app/ui";
import { createTeacher, saveMerchant } from "./actions";

export function MerchantForm({ value }: { value: string | null }) {
  return (
    <ActionForm action={saveMerchant} className="flex flex-wrap items-end gap-3">
      <label className="block min-w-60 flex-1">
        <span className="text-sm font-semibold">Numéro marchand Orange Money</span>
        <input
          name="merchantNumber"
          defaultValue={value ?? ""}
          inputMode="tel"
          placeholder="032 12 345 67"
          className="field-input mt-1.5 font-mono"
        />
        <FieldError name="merchantNumber" />
      </label>
      <SubmitButton className={buttonClass("primary")}>Enregistrer</SubmitButton>
    </ActionForm>
  );
}

export function TeacherDialog({ subjects }: { subjects: { id: number; name: string }[] }) {
  return (
    <ModalButton label="Nouvel enseignant" title="Nouvel enseignant" icon={<Plus className="size-5" />}>
      {(close) => (
        <SecretForm action={createTeacher} onClose={close}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Text name="fullName" label="Nom complet" />
              <Text name="username" label="Identifiant de connexion" placeholder="prof.rakoto" />
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Matière enseignée</span>
              <select name="subjectId" required defaultValue="" className="field-input mt-1.5">
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
              <Text name="email" label="Email" required={false} />
              <Text name="phone" label="Téléphone" required={false} />
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Présentation (visible par l&apos;Admin)</span>
              <textarea name="bio" rows={2} maxLength={300} className="field-input mt-1.5" />
            </label>
            <p className="rounded-lg bg-info-soft p-3 text-sm text-info">
              Les candidats ne voient jamais le nom de l&apos;enseignant : seulement sa matière.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className={buttonClass("ghost")}>
                Annuler
              </button>
              <SubmitButton className={buttonClass("primary")}>Créer le compte</SubmitButton>
            </div>
          </div>
        </SecretForm>
      )}
    </ModalButton>
  );
}

function Text({
  name,
  label,
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input name={name} required={required} placeholder={placeholder} className="field-input mt-1.5" />
      <FieldError name={name} />
    </label>
  );
}
