"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

/** Recherche instantanée : met à jour `?q=` (avec un léger délai) et revient à la page 1. */
export function SearchInput({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(param) ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const current = params.get(param) ?? "";
    if (value === current) return;
    const id = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value) next.set(param, value);
      else next.delete(param);
      next.delete("page");
      startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(id);
  }, [value, params, param, pathname, router]);

  return (
    <div className="relative w-full sm:w-80">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field-input pl-9"
      />
      {pending && (
        <span className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-vert border-t-transparent" />
      )}
    </div>
  );
}
