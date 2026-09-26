"use client";

import { TriangleAlert } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/lib/action";
import { ActionForm, SubmitButton } from "./ActionForm";
import { useReadOnly } from "./ReadOnly";
import { buttonClass, type ButtonVariant } from "./ui";

/**
 * Bouton qui ouvre une fenêtre de confirmation, puis envoie l'action.
 * `fields` : champs cachés ; `children` : champs visibles dans la fenêtre (motif…).
 */
export function ConfirmAction({
  action,
  label,
  title,
  description,
  confirmLabel = "Confirmer",
  variant = "primary",
  size = "md",
  fields = {},
  children,
  icon,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  label: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  fields?: Record<string, string>;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const readOnly = useReadOnly();
  return (
    <>
      <button
        type="button"
        className={buttonClass(variant, size)}
        disabled={readOnly}
        title={readOnly ? "Consultation seule" : undefined}
        onClick={() => dialog.current?.showModal()}
      >
        {icon}
        {label}
      </button>
      <dialog
        ref={dialog}
        className="modal"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <ActionForm
          action={action}
          onSuccess={() => dialog.current?.close()}
          className="rounded-2xl bg-raised p-6 text-ink shadow-md"
        >
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <div className="flex items-start gap-4">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-full ${
                variant === "danger" ? "bg-danger-soft text-danger" : "bg-vert-soft text-vert"
              }`}
            >
              <TriangleAlert className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="t-h3">{title}</h2>
              {description && <div className="mt-1 text-sm text-muted">{description}</div>}
              {children && <div className="mt-4 space-y-4">{children}</div>}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={buttonClass("ghost")} onClick={() => dialog.current?.close()}>
              Annuler
            </button>
            <SubmitButton className={buttonClass(variant)}>{confirmLabel}</SubmitButton>
          </div>
        </ActionForm>
      </dialog>
    </>
  );
}

/** Fenêtre modale générique ouverte par un bouton (formulaires de création…). */
export function ModalButton({
  label,
  title,
  variant = "primary",
  size = "md",
  icon,
  children,
}: {
  label: ReactNode;
  title: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const readOnly = useReadOnly();
  const close = useCallback(() => setOpen(false), []);

  // Le <dialog> natif suit l'état React (fond, touche Échap, focus piégé).
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={buttonClass(variant, size)}
        disabled={readOnly}
        title={readOnly ? "Consultation seule" : undefined}
        onClick={() => setOpen(true)}
      >
        {icon}
        {label}
      </button>
      <dialog
        ref={dialog}
        className="modal"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      >
        {open && (
          <div className="rounded-2xl bg-raised p-6 text-ink shadow-md">
            <h2 className="t-h3 mb-4">{title}</h2>
            {children(close)}
          </div>
        )}
      </dialog>
    </>
  );
}
