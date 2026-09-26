"use client";

import { KeyRound, Power } from "lucide-react";
import { SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction, ModalButton } from "@/components/app/ConfirmAction";
import { SecretForm } from "@/components/app/SecretForm";
import { buttonClass } from "@/components/app/ui";
import { resetFreeCandidatePassword, toggleFreeCandidateAccount } from "./actions";

/** Mot de passe et accès d'un candidat libre, depuis sa fiche. */
export function FreeCandidateAccountActions({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  return (
    <>
      <ModalButton
        label="Nouveau mot de passe"
        title={`Nouveau mot de passe · ${name}`}
        variant="secondary"
        size="sm"
        icon={<KeyRound className="size-4" />}
      >
        {(close) => (
          <SecretForm action={resetFreeCandidatePassword} onClose={close}>
            <input type="hidden" name="id" value={id} />
            <p className="text-sm text-muted">
              L&apos;ancien mot de passe ne fonctionnera plus et ses sessions ouvertes seront fermées. Le
              nouveau figure aussi sur la convocation à réimprimer.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={close} className={buttonClass("ghost")}>
                Annuler
              </button>
              <SubmitButton className={buttonClass("primary")}>Générer</SubmitButton>
            </div>
          </SecretForm>
        )}
      </ModalButton>
      <ConfirmAction
        action={toggleFreeCandidateAccount}
        fields={{ id }}
        label={active ? "Désactiver le compte" : "Réactiver le compte"}
        title={active ? `Désactiver le compte de ${name} ?` : `Réactiver le compte de ${name} ?`}
        description={
          active
            ? "Le candidat ne pourra plus se connecter (site et application). Son dossier est conservé."
            : "Le candidat pourra de nouveau se connecter avec son mot de passe actuel."
        }
        confirmLabel={active ? "Désactiver" : "Réactiver"}
        variant={active ? "danger" : "primary"}
        size="sm"
        icon={<Power className="size-4" />}
      />
    </>
  );
}
