"use client";

import { useTransition } from "react";
import { setLang } from "@/app/actions/lang";
import type { Lang } from "@/lib/i18n";

/** Choix de langue FR · MG, visible dans l'en-tête (charte v2). */
export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div role="group" aria-label={label} className="flex rounded-full bg-sunken p-1 text-sm font-bold">
      {(["fr", "mg"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          disabled={pending}
          onClick={() => startTransition(() => setLang(l))}
          className={`rounded-full px-3 py-1 transition-colors ${
            lang === l ? "bg-raised text-vert shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
