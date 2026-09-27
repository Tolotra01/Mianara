"use client";

import { Pencil, Plus, UserPlus } from "lucide-react";
import { FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ActionForm } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { SecretForm } from "@/components/app/SecretForm";
import { buttonClass } from "@/components/app/ui";
import { PHONE_INPUT } from "@/lib/phone";
import { createAgent, saveOffice } from "../actions";

type Office = {
  id: number;
  name: string;
  university: string;
  city: string;
  address: string | null;
  phone: string | null;
};

function Field({
  name,
  label,
  defaultValue,
  required = true,
  inputProps,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  inputProps?: React.ComponentProps<"input">;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="field-input mt-1.5"
        {...inputProps}
      />
      <FieldError name={name} />
    </label>
  );
}

export function OfficeDialog({ office }: { office?: Office }) {
  return (
    <ModalButton
      label={office ? <span className="sr-only">Modifier</span> : "Nouvel Office"}
      title={office ? `Modifier · ${office.name}` : "Nouvel Office du Bacc"}
      variant={office ? "ghost" : "primary"}
      size={office ? "sm" : "md"}
      icon={office ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-5" />}
    >
      {(close) => (
        <ActionForm action={saveOffice} onSuccess={close} className="space-y-4">
          {office && <input type="hidden" name="id" value={office.id} />}
          <Field name="name" label="Nom" defaultValue={office?.name} />
          <Field name="university" label="Université de rattachement" defaultValue={office?.university} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="city" label="Ville" defaultValue={office?.city} />
            <Field
              name="phone"
              label="Téléphone"
              defaultValue={office?.phone}
              required={false}
              inputProps={PHONE_INPUT}
            />
          </div>
          <Field name="address" label="Adresse" defaultValue={office?.address} required={false} />
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

export function AgentDialog({ officeId, officeName }: { officeId: number; officeName: string }) {
  return (
    <ModalButton
      label="Agent"
      title={`Nouvel agent · ${officeName}`}
      variant="secondary"
      size="sm"
      icon={<UserPlus className="size-4" />}
    >
      {(close) => (
        <SecretForm action={createAgent} onClose={close}>
          <input type="hidden" name="officeId" value={officeId} />
          <Field name="fullName" label="Nom complet" />
          <Field name="username" label="Identifiant de connexion" />
          <Field name="email" label="Email" required={false} />
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
