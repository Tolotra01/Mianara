"use client";

import { KeyRound, Pencil, Plus } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { SecretForm } from "@/components/app/SecretForm";
import { buttonClass } from "@/components/app/ui";
import { createSchoolAccount, saveSchool } from "../actions";

type School = {
  id: number;
  officeId: number;
  code: string;
  name: string;
  kind: string;
  commune: string;
  address: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
};

function Field({
  name,
  label,
  defaultValue,
  required = true,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-sm font-semibold">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="field-input mt-1.5"
      />
      <FieldError name={name} />
    </label>
  );
}

export function SchoolDialog({
  school,
  offices,
}: {
  school?: School;
  offices: { id: number; name: string }[];
}) {
  return (
    <ModalButton
      label={school ? <span className="sr-only">Modifier</span> : "Nouvelle école"}
      title={school ? `Modifier · ${school.name}` : "Nouvelle école"}
      variant={school ? "ghost" : "primary"}
      size={school ? "sm" : "md"}
      icon={school ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-5" />}
    >
      {(close) => (
        <ActionForm action={saveSchool} onSuccess={close} className="space-y-4">
          {school && <input type="hidden" name="id" value={school.id} />}
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Field name="name" label="Nom de l'établissement" defaultValue={school?.name} />
            <Field name="code" label="Code" defaultValue={school?.code} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Office du Bac</span>
              <select
                name="officeId"
                defaultValue={school?.officeId ?? ""}
                required
                className="field-input mt-1.5"
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <FieldError name="officeId" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Statut</span>
              <select name="kind" defaultValue={school?.kind ?? "public"} className="field-input mt-1.5">
                <option value="public">Public</option>
                <option value="prive">Privé</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="commune" label="Commune" defaultValue={school?.commune} />
            <Field name="address" label="Adresse" defaultValue={school?.address} required={false} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              name="contactName"
              label="Responsable"
              defaultValue={school?.contactName}
              required={false}
            />
            <Field name="phone" label="Téléphone" defaultValue={school?.phone} required={false} />
            <Field name="email" label="Email" defaultValue={school?.email} required={false} />
          </div>
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

export function SchoolAccountDialog({ schoolId, schoolName }: { schoolId: number; schoolName: string }) {
  return (
    <ModalButton
      label="Compte"
      title={`Compte d'accès · ${schoolName}`}
      variant="secondary"
      size="sm"
      icon={<KeyRound className="size-4" />}
    >
      {(close) => (
        <SecretForm action={createSchoolAccount} onClose={close}>
          <input type="hidden" name="schoolId" value={schoolId} />
          <Field name="fullName" label="Nom de la personne (direction, secrétariat)" />
          <Field name="username" label="Identifiant de connexion" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton className={buttonClass("primary")}>Créer le compte</SubmitButton>
          </div>
        </SecretForm>
      )}
    </ModalButton>
  );
}
