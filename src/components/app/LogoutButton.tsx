"use client";

import { LogOut } from "lucide-react";
import { useRef, useTransition } from "react";
import { logout } from "@/app/actions/auth";
import { buttonClass } from "./ui";

/**
 * Déconnexion : la confirmation évite de fermer un formulaire non enregistré
 * d'un simple clic sur l'icône.
 */
export function LogoutButton({ className }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={`grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger ${className ?? ""}`}
        aria-label="Se déconnecter"
        title="Se déconnecter"
      >
        <LogOut className="size-[18px]" />
      </button>
      <dialog
        ref={dialog}
        className="modal"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div className="rounded-2xl bg-raised p-6 text-ink shadow-md">
          <h2 className="t-h3">Se déconnecter ?</h2>
          <p className="mt-1 text-sm text-muted">
            Toute saisie non enregistrée dans cette page sera perdue.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={buttonClass("ghost")} onClick={() => dialog.current?.close()}>
              Annuler
            </button>
            <button
              type="button"
              disabled={pending}
              className={buttonClass("danger")}
              onClick={() => startTransition(() => logout())}
            >
              {pending && (
                <span
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden
                />
              )}
              Se déconnecter
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
