"use client";

import { FieldError, SubmitButton } from "@/components/app/ActionForm";
import { buttonClass } from "@/components/app/ui";

const FIELDS = [
  { name: "current", label: "Mot de passe actuel", autoComplete: "current-password" },
  {
    name: "next",
    label: "Nouveau mot de passe",
    autoComplete: "new-password",
    hint: "8 caractères au moins, avec une lettre et un chiffre.",
  },
  { name: "confirm", label: "Confirmer le nouveau mot de passe", autoComplete: "new-password" },
];

export function PasswordFields({ submitLabel }: { submitLabel: string }) {
  return (
    <div className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="text-sm font-semibold">
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type="password"
            required
            autoComplete={f.autoComplete}
            className="field-input mt-1.5"
          />
          {f.hint && <p className="mt-1 text-sm text-muted">{f.hint}</p>}
          <FieldError name={f.name} />
        </div>
      ))}
      <SubmitButton className={`${buttonClass("primary")} w-full`}>{submitLabel}</SubmitButton>
    </div>
  );
}
