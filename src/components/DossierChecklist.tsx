"use client";

import { Check, School, UserRound } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import type { CandidateType, DossierItem } from "@/content/bac";

const STORAGE_KEY = "mianara-dossier";

/** Checklist du dossier ; les cases cochées restent sur cet appareil. */
export function DossierChecklist({
  items,
  icons,
  confirmBadge,
}: {
  items: DossierItem[];
  icons: Record<string, ReactNode>;
  confirmBadge: ReactNode;
}) {
  const [type, setType] = useState<Exclude<CandidateType, "tous">>("ecole");
  const [done, setDone] = useState<string[]>([]);

  // Relecture du stockage local après l'hydratation (absent côté serveur).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved?.type === "ecole" || saved?.type === "libre") setType(saved.type);
      if (Array.isArray(saved?.done)) setDone(saved.done);
    } catch {
      // Stockage indisponible : la liste fonctionne sans mémoire.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, done }));
    } catch {}
  }, [type, done]);

  const visible = items.filter((i) => i.candidateType === "tous" || i.candidateType === type);
  const count = visible.filter((i) => done.includes(i.label)).length;
  const pct = visible.length ? Math.round((count / visible.length) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-4xl border border-line bg-raised shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-sunken p-4">
        <div role="radiogroup" aria-label="Je suis" className="flex gap-2">
          {(
            [
              { value: "ecole", label: "Candidat d'école", icon: School },
              { value: "libre", label: "Candidat libre", icon: UserRound },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={type === o.value}
              onClick={() => setType(o.value)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition-colors ${
                type === o.value ? "bg-vert text-on-vert" : "bg-raised text-ink hover:text-vert"
              }`}
            >
              <o.icon className="size-4" aria-hidden />
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-48 flex-1 items-center gap-3 sm:max-w-xs">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-soleil transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-bold tabular-nums">
            {count}/{visible.length}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-line">
        {visible.map((item) => {
          const checked = done.includes(item.label);
          return (
            <li key={item.label}>
              <label className="flex cursor-pointer items-start gap-4 p-5 transition-colors hover:bg-sunken/60">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  onChange={() =>
                    setDone((d) => (checked ? d.filter((l) => l !== item.label) : [...d, item.label]))
                  }
                />
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-sm border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus-ring)] ${
                    checked ? "border-vert bg-vert text-on-vert" : "border-line-strong bg-raised"
                  }`}
                  aria-hidden
                >
                  {checked && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soleil-soft text-warning">
                  {icons[item.icon]}
                </span>
                <span className="flex-1">
                  <span
                    className={`flex flex-wrap items-center gap-2 font-bold ${checked ? "text-muted line-through" : ""}`}
                  >
                    {item.label}
                    {!item.confirmed && confirmBadge}
                  </span>
                  <span className="mt-1 block text-muted">{item.detail}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
