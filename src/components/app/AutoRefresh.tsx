"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Rafraîchit les données de la page à intervalle régulier (suivi des épreuves en direct). */
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  const [last, setLast] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setLast(new Date());
      }
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-vert-soft px-3 py-1 text-sm font-semibold text-vert">
      <span className="relative flex size-2.5">
        <span className="anim-ping absolute inline-flex size-full rounded-full bg-vert opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-vert" />
      </span>
      En direct ·{" "}
      {last.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}
