"use client";

import { useEffect, useState } from "react";

/** Compte à rebours (jours, heures, minutes) jusqu'à une date. */
export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Mise à jour chaque minute, côté navigateur uniquement (évite un écart d'hydratation).
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - (now ?? new Date(to).getTime()));
  const parts = [
    { v: Math.floor(diff / 86400000), l: "jours" },
    { v: Math.floor((diff / 3600000) % 24), l: "heures" },
    { v: Math.floor((diff / 60000) % 60), l: "min" },
  ];
  return (
    <div className="flex gap-2" aria-live="off">
      {parts.map((p) => (
        <span key={p.l} className="min-w-16 rounded-xl bg-raised/15 px-3 py-2 text-center">
          <span className="block text-3xl font-extrabold tabular-nums">{now === null ? "–" : p.v}</span>
          <span className="block text-xs font-semibold opacity-80">{p.l}</span>
        </span>
      ))}
    </div>
  );
}
