"use client";

import { KeyRound } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { ActionState } from "@/lib/action";
import { ActionForm } from "./ActionForm";
import { CopyButton } from "./CopyButton";
import { buttonClass } from "./ui";

/** Formulaire de création de compte : affiche une seule fois le mot de passe temporaire généré. */
export function SecretForm({
  action,
  children,
  onClose,
}: {
  action: (s: ActionState, f: FormData) => Promise<ActionState>;
  children: ReactNode;
  onClose: () => void;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  if (secret) {
    return (
      <div className="anim-scale space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-soleil-soft p-4 text-sm">
          <KeyRound className="mt-0.5 size-5 shrink-0 text-warning" />
          <p>
            Mot de passe temporaire à transmettre à la personne : <strong>il ne sera plus affiché</strong>.
            Elle devra le changer à sa première connexion.
          </p>
        </div>
        <p className="flex items-center justify-center gap-3 rounded-xl border border-line p-4 font-mono text-xl font-bold">
          {secret}
          <CopyButton value={secret} label="Copier le mot de passe" />
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            className={buttonClass("primary")}
            onClick={() => {
              setSecret(null);
              onClose();
            }}
          >
            J&apos;ai noté le mot de passe
          </button>
        </div>
      </div>
    );
  }
  return (
    <ActionForm action={action} onSuccess={(s) => s.secret && setSecret(s.secret)} className="space-y-4">
      {children}
    </ActionForm>
  );
}
