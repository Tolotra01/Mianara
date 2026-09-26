"use client";

import { useTransition } from "react";
import { setLang } from "@/app/actions/lang";
import type { Lang } from "@/lib/i18n";

/** Choix de langue FR · MG, visible dans l'en-tête (charte v2). */
export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-full border border-line/70 bg-raised/50 p-1 text-xs font-extrabold"
    >
      {(["fr", "mg"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          disabled={pending}
          onClick={() => startTransition(() => setLang(l))}
          className={`rounded-full px-3 py-1.5 tracking-[0.12em] transition-colors ${
            lang === l ? "bg-vert text-on-vert shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
