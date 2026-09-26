"use client";

import { useTransition } from "react";
import { setLang } from "@/app/actions/lang";
import type { Lang } from "@/lib/i18n";

/** Drapeaux vectoriels plutôt qu'emoji : Windows ne rend pas les emojis
 *  drapeaux (il affiche à la place les lettres « FR »/« MG »), alors qu'un
 *  SVG affiche toujours le drapeau aux couleurs exactes. Le nom de la langue,
 *  lui, reste porté par `aria-label` — un dessin n'a rien à dire à un lecteur
 *  d'écran. */
const LANGS = {
  fr: { name: "Français" },
  mg: { name: "Malagasy" },
} as const;

function Flag({ lang }: { lang: Lang }) {
  return (
    <svg viewBox="0 0 3 2" className="block h-full w-full" aria-hidden focusable="false">
      {lang === "fr" ? (
        <>
          <rect width="1" height="2" fill="#002395" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#ED2939" />
        </>
      ) : (
        <>
          <rect width="1" height="2" fill="#ffffff" />
          <rect x="1" width="2" height="1" fill="#FC3D32" />
          <rect x="1" y="1" width="2" height="1" fill="#009639" />
        </>
      )}
    </svg>
  );
}

export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-1 rounded-full border border-line/70 bg-raised/50 p-1"
    >
      {(["fr", "mg"] as const).map((l) => (
        <button
          key={l}
          type="button"
          title={LANGS[l].name}
          aria-label={LANGS[l].name}
          aria-pressed={lang === l}
          disabled={pending}
          onClick={() => startTransition(() => setLang(l))}
          className={`group grid size-9 place-items-center rounded-full transition-all duration-200 ${
            lang === l ? "bg-vert shadow-sm ring-2 ring-vert/50" : "hover:bg-sunken"
          }`}
        >
          <span className="block h-4 w-6 overflow-hidden rounded-[3px] ring-1 ring-line transition-transform duration-200 group-hover:scale-105">
            <Flag lang={l} />
          </span>
        </button>
      ))}
    </div>
  );
}
