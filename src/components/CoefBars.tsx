import { ToConfirm } from "@/components/ui";
import type { Coefficient } from "@/lib/data";
import type { Lang } from "@/lib/i18n";
import { subjectName } from "@/lib/i18n-content";

/** Coefficients d'une série en barres horizontales (longueur ∝ coefficient). */
export function CoefBars({ items, lang = "fr" }: { items: Coefficient[]; lang?: Lang }) {
  const max = Math.max(...items.map((c) => c.coefficient));
  return (
    <ul className="space-y-2.5">
      {items.map((c) => (
        <li key={c.subjectCode} className="grid grid-cols-[minmax(0,11rem)_1fr] items-center gap-3">
          <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            {subjectName(c.subjectCode, c.subjectName, lang)}
            {!c.confirmed && <ToConfirm lang={lang} />}
          </span>
          <span className="flex items-center gap-2">
            <span
              className={`h-7 rounded-full ${c.isCore ? "bg-vert" : c.confirmed ? "bg-soleil" : "bg-line-strong/40"}`}
              style={{ width: `${(c.coefficient / max) * 100}%`, minWidth: "1.75rem" }}
              title={c.note ?? undefined}
            />
            <span className="w-6 text-lg font-bold tabular-nums">{c.coefficient}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
