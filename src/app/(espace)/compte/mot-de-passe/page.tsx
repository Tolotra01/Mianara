import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { Alert } from "@/components/app/ui";
import { requireUser } from "@/lib/auth";
import { changePassword } from "../actions";
import { PasswordFields } from "../PasswordFields";

export const metadata: Metadata = { title: "Choisir un mot de passe" };

export default async function MotDePassePage() {
  const user = await requireUser(["admin", "office", "supervisor", "candidate", "school"], {
    allowPasswordChange: true,
  });
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-3xl border border-line bg-raised p-8 shadow-md">
        <span className="grid size-14 place-items-center rounded-2xl bg-soleil-soft text-warning">
          <KeyRound className="size-7" aria-hidden />
        </span>
        <h1 className="t-h2 mt-4">
          {user.mustChangePassword ? "Choisissez votre mot de passe" : "Changer de mot de passe"}
        </h1>
        <p className="mt-1 text-muted">
          {user.mustChangePassword
            ? "Première connexion : remplacez le mot de passe temporaire de votre convocation."
            : "Votre nouveau mot de passe remplace l'ancien immédiatement."}
        </p>
        {user.mustChangePassword && (
          <div className="mt-5">
            <Alert tone="info">Le mot de passe actuel est celui imprimé sur votre convocation.</Alert>
          </div>
        )}
        <ActionForm action={changePassword} className="mt-6">
          <PasswordFields submitLabel="Enregistrer mon mot de passe" />
        </ActionForm>
      </div>
    </div>
  );
}
