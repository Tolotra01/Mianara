"use client";

import type { ReactNode } from "react";
import { askAssistant } from "./events";

/** Bouton qui ouvre l'assistant flottant (et y envoie `question` si fournie). */
export function AskButton({
  question,
  className,
  children,
}: {
  question?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" onClick={() => askAssistant(question)} className={className}>
      {children}
    </button>
  );
}
