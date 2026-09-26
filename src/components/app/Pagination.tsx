import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/** Pagination par `?page=`, en conservant les autres filtres. */
export function Pagination({
  page,
  pages,
  total,
  params,
  basePath,
}: {
  page: number;
  pages: number;
  total: number;
  params: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    return q.size ? `${basePath}?${q}` : basePath;
  };
  const cls =
    "grid size-9 place-items-center rounded-lg border border-line bg-raised transition-colors hover:border-vert hover:text-vert";
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
      <span className="text-muted">
        {total.toLocaleString("fr-FR")} résultat{total > 1 ? "s" : ""} · page {page} sur {Math.max(1, pages)}
      </span>
      <div className="flex gap-1.5">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cls} aria-label="Page précédente">
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className={`${cls} pointer-events-none opacity-40`}>
            <ChevronLeft className="size-4" />
          </span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={cls} aria-label="Page suivante">
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={`${cls} pointer-events-none opacity-40`}>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Onglets de filtre sous forme de liens (`?cle=valeur`). */
export function FilterTabs({
  options,
  active,
  param,
  params,
  basePath,
}: {
  options: { value: string; label: string; count?: number }[];
  active: string;
  param: string;
  params: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-sunken p-1">
      {options.map((o) => {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(params))
          if (typeof v === "string" && v && k !== param && k !== "page") q.set(k, v);
        if (o.value) q.set(param, o.value);
        const on = active === o.value;
        return (
          <Link
            key={o.value || "all"}
            href={q.size ? `${basePath}?${q}` : basePath}
            scroll={false}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
              on ? "bg-raised text-vert shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
            {o.count != null && (
              <span
                className={`rounded-full px-1.5 text-xs ${on ? "bg-vert-soft text-vert" : "bg-raised text-muted"}`}
              >
                {o.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
