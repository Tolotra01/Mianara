"use client";

import { Eye, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { endOfficeVisit } from "@/app/actions/visit";

/** Bandeau affiché à l'Admin qui consulte l'espace d'un Office. */
export function VisitBanner({ officeName }: { officeName: string }) {
  const pathname = usePathname();
  if (!pathname.startsWith("/office")) return null;
  return (
    <div className="anim-fade sticky top-16 z-20 flex flex-wrap items-center gap-3 border-b border-soleil bg-soleil-soft px-4 py-2.5 text-sm sm:px-8">
      <Eye className="size-4 shrink-0 text-warning" aria-hidden />
      <p className="flex-1">
        <strong>Mode consultation</strong> · {officeName}. Vous voyez l&apos;espace comme un agent, sans
        pouvoir le modifier.
      </p>
      <form action={endOfficeVisit}>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-raised px-3 py-1.5 font-semibold shadow-sm hover:text-vert"
        >
          <LogOut className="size-4" /> Quitter la visite
        </button>
      </form>
    </div>
  );
}
