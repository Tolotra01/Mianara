import type { ReactNode } from "react";

/**
 * Graphiques légers en HTML (pas de bibliothèque) :
 *  - BarList : comparer des effectifs (une seule teinte, valeur au bout de la barre) ;
 *  - StackedBar : répartition d'un tout par statut (légende + effectifs toujours visibles).
 *  - Ring : taux unique sur une jauge circulaire.
 * Chaque segment a une info-bulle au survol et le détail chiffré reste lisible en texte.
 */

export function BarList({
  items,
  unit = "",
  emptyLabel = "Aucune donnée",
}: {
  items: { label: ReactNode; value: number; key: string; hint?: string }[];
  unit?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.key} className="group grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3">
          <span className="truncate text-sm font-semibold">{item.label}</span>
          <span className="relative flex items-center gap-2">
            <span
              className="h-5 rounded-r-[4px] bg-vert transition-[width,opacity] duration-700 ease-out group-hover:opacity-80"
              style={{
                width: `${(item.value / max) * 85}%`,
                minWidth: item.value ? 4 : 0,
                transitionDelay: `${i * 60}ms`,
              }}
            />
            <span className="text-sm font-bold tabular-nums">
              {item.value.toLocaleString("fr-FR")}
              {unit}
            </span>
            {item.hint && (
              <span className="pointer-events-none absolute -top-9 left-0 z-10 rounded-md bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-surface opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {item.hint}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export type Segment = { key: string; label: string; value: number; color: string; icon?: ReactNode };

export function StackedBar({
  segments,
  total,
  height = 14,
}: {
  segments: Segment[];
  total?: number;
  height?: number;
}) {
  const sum = total ?? segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div
        className="flex w-full gap-[2px] overflow-hidden rounded-[4px] bg-sunken"
        style={{ height }}
        role="img"
        aria-label={segments.map((s) => `${s.label} : ${s.value}`).join(", ")}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              className="group relative h-full transition-[width] duration-700 ease-out first:rounded-l-[4px] last:rounded-r-[4px]"
              style={{ width: `${sum ? (s.value / sum) * 100 : 0}%`, background: s.color }}
              title={`${s.label} : ${s.value}`}
            />
          ))}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden />
            <span className="text-muted">{s.label}</span>
            <span className="font-bold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Jauge circulaire (ratio unique : taux de présence, d'admission…). */
export function Ring({ value, label, size = 112 }: { value: number; label: string; size?: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--vert-soft)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--vert)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <span className="absolute text-center">
        <span className="block text-2xl font-extrabold">{Math.round(pct)}%</span>
        <span className="block text-xs font-semibold text-muted">{label}</span>
      </span>
    </div>
  );
}
