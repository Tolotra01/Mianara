"use client";

import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { CopyButton } from "@/components/app/CopyButton";
import { buttonClass } from "@/components/app/ui";
import { createSupervisor } from "./actions";

export function SupervisorCreate() {
  const [secret, setSecret] = useState<{ user: string; password: string } | null>(null);
  const [username, setUsername] = useState("");
  return (
    <ModalButton label="Nouveau surveillant" title="Nouveau surveillant" icon={<Plus className="size-5" />}>
      {(close) =>
        secret ? (
          <div className="anim-scale space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-soleil-soft p-4">
              <KeyRound className="mt-0.5 size-5 shrink-0 text-warning" />
              <p className="text-sm">
                Notez ce mot de passe temporaire et remettez-le au surveillant :{" "}
                <strong>il ne sera plus affiché</strong>. Il devra le changer à sa première connexion.
              </p>
            </div>
            <dl className="rounded-xl border border-line p-4">
              <dt className="text-xs font-bold text-muted uppercase">Identifiant</dt>
              <dd className="font-mono font-semibold">{secret.user}</dd>
              <dt className="mt-3 text-xs font-bold text-muted uppercase">Mot de passe temporaire</dt>
              <dd className="flex items-center gap-2 font-mono text-lg font-bold">
                {secret.password}
                <CopyButton
                  value={secret.password}
                  label="Copier le mot de passe"
                  iconClassName="size-4"
                />
              </dd>
            </dl>
            <div className="flex justify-end">
              <button
                type="button"
                className={buttonClass("primary")}
                onClick={() => {
                  setSecret(null);
                  setUsername("");
                  close();
                }}
              >
                J&apos;ai noté le mot de passe
              </button>
            </div>
          </div>
        ) : (
          <ActionForm
            action={createSupervisor}
            onSuccess={(s) => s.secret && setSecret({ user: username.toLowerCase(), password: s.secret })}
            className="space-y-4"
          >
            <label className="block">
              <span className="text-sm font-semibold">Nom complet</span>
              <input
                name="fullName"
                required
                className="field-input mt-1.5"
                onChange={(e) => {
                  const slug = e.target.value
                    .normalize("NFD")
                    .replace(/[̀-ͯ]/g, "")
                    .toLowerCase()
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .join(".");
                  setUsername(slug ? `surv.${slug}` : "");
                }}
              />
              <FieldError name="fullName" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Identifiant de connexion</span>
              <input
                name="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field-input mt-1.5 font-mono"
              />
              <FieldError name="username" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Téléphone</span>
              <input name="phone" type="tel" className="field-input mt-1.5" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className={buttonClass("ghost")}>
                Annuler
              </button>
              <SubmitButton className={buttonClass("primary")}>Créer le compte</SubmitButton>
            </div>
          </ActionForm>
        )
      }
    </ModalButton>
  );
}
