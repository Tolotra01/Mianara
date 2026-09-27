"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "./Toaster";

type State = "idle" | "copied" | "error";

const ICON = {
  idle: { Icon: Copy, className: "text-muted group-hover:text-vert", label: "Copier" },
  copied: { Icon: Check, className: "text-vert", label: "Copié" },
  error: { Icon: TriangleAlert, className: "text-danger", label: "Copie impossible" },
} as const;

/**
 * Bouton de copie qui n'affiche « Copié » que si l'écriture dans le
 * presse-papiers a réellement abouti : l'API Clipboard peut être absente
 * (contexte non sécurisé) ou refuser l'écriture (permission révoquée), et
 * l'icône d'origine laissait croire à un succès.
 */
export function CopyButton({
  value,
  label,
  className = "",
  iconClassName = "size-5",
}: {
  value: string;
  /** Libellé du bouton à l'état normal, utilisé aussi pour l'accessibilité. */
  label?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    let done = false;
    try {
      await navigator.clipboard.writeText(value);
      done = true;
    } catch {
      toast({
        ok: false,
        message: "Copie refusée par le navigateur : le mot de passe n'a pas été copié.",
      });
    }
    setState(done ? "copied" : "error");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  const { Icon, className: tone, label: stateLabel } = ICON[state];

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={`group -m-1 rounded-md p-1 transition-colors ${tone} ${className}`}
        title={label ?? stateLabel}
        aria-label={state === "idle" ? (label ?? stateLabel) : stateLabel}
      >
        <Icon className={`${iconClassName} ${state === "copied" ? "anim-pop" : ""}`} />
      </button>
      {/* Annonce lisible par un lecteur d'écran : le retour visuel est une icône. */}
      <span role="status" aria-live="polite" className="sr-only">
        {state === "idle" ? "" : stateLabel}
      </span>
    </>
  );
}
