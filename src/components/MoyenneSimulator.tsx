"use client";

import { CircleAlert, PartyPopper, Scale, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import type { SerieCode } from "@/content/bac";
import type { Coefficient } from "@/lib/data";

type Mention = { key: string; label: string; min: number; max: number };

type Props = {
  series: { code: SerieCode; name: string }[];
  coefficients: Coefficient[];
  mentions: readonly Mention[];
  admission: number;
  juryFloor: number;
  initialSerie: SerieCode;
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Simulateur : moyenne = Σ(note × coefficient) / Σ coefficients (décret 2021-242). */
export function MoyenneSimulator({
  series,
  coefficients,
  mentions,
  admission,
  juryFloor,
  initialSerie,
}: Props) {
  const [serie, setSerie] = useState<SerieCode>(initialSerie);
  const [notes, setNotes] = useState<Record<string, number>>({});

  const rows = coefficients.filter((c) => c.serieCode === serie);
  const noteOf = (code: string) => notes[`${serie}:${code}`] ?? 10;

  const { average, totalCoef, zero } = useMemo(() => {
    const totalCoef = rows.reduce((s, r) => s + r.coefficient, 0);
    const sum = rows.reduce((s, r) => s + noteOf(r.subjectCode) * r.coefficient, 0);
    return {
      average: totalCoef ? sum / totalCoef : 0,
      totalCoef,
      zero: rows.some((r) => noteOf(r.subjectCode) === 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, notes, serie]);

  const mention = mentions.find((m) => average >= m.min && (average < m.max || m.max === 20));
  const verdict = zero
    ? {
        tone: "danger",
        icon: CircleAlert,
        title: "Note éliminatoire",
        text: "Un 0 à une épreuve est éliminatoire, sauf décision du jury.",
      }
    : average >= admission
      ? {
          tone: "success",
          icon: PartyPopper,
          title: `Admis · mention ${mention?.label ?? ""}`,
          text: "Bravo ! Continue comme ça jusqu'au jour J.",
        }
      : average >= juryFloor
        ? {
            tone: "warning",
            icon: Scale,
            title: "Entre les mains du jury",
            text: `Le jury peut abaisser le seuil jusqu'à ${fmt(juryFloor)}. Mieux vaut viser 10.`,
          }
        : {
            tone: "info",
            icon: Sprout,
            title: "Pas encore admis",
            text: "Chaque point compte : commence par les matières à coefficient 5.",
          };

  const toneClass = {
    danger: "bg-danger-soft text-danger",
    success: "bg-vert-soft text-vert",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
  }[verdict.tone];

  // Jauge demi-cercle : 0 → 20.
  const angle = Math.PI * (1 - Math.min(average, 20) / 20);
  const needle = { x: 100 + 72 * Math.cos(angle), y: 100 - 72 * Math.sin(angle) };
  const arc = (from: number, to: number) => {
    const a1 = Math.PI * (1 - from / 20);
    const a2 = Math.PI * (1 - to / 20);
    return `M${100 + 80 * Math.cos(a1)} ${100 - 80 * Math.sin(a1)} A80 80 0 0 1 ${100 + 80 * Math.cos(a2)} ${100 - 80 * Math.sin(a2)}`;
  };

  return (
    <div className="overflow-hidden rounded-4xl border border-line bg-raised shadow-sm">
      <div role="tablist" aria-label="Série" className="flex gap-2 border-b border-line bg-sunken p-3">
        {series.map((s) => (
          <button
            key={s.code}
            role="tab"
            type="button"
            aria-selected={serie === s.code}
            onClick={() => setSerie(s.code)}
            className={`flex-1 rounded-2xl px-4 py-3 text-left transition-colors ${
              serie === s.code ? "bg-raised text-vert shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            <span className="block text-xl font-extrabold">{s.code}</span>
            <span className="block truncate text-sm font-semibold">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[3fr_2fr]">
        <ul className="space-y-4">
          {rows.map((r) => {
            const id = `note-${serie}-${r.subjectCode}`;
            const value = noteOf(r.subjectCode);
            return (
              <li key={r.subjectCode}>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor={id} className="font-semibold">
                    {r.subjectName}
                    <span
                      className={`ml-2 rounded-sm px-1.5 py-0.5 text-xs font-bold ${r.isCore ? "bg-vert text-on-vert" : "bg-sunken text-muted"}`}
                    >
                      coef. {r.coefficient}
                    </span>
                  </label>
                  <output
                    htmlFor={id}
                    className={`text-lg font-bold tabular-nums ${value === 0 ? "text-danger" : ""}`}
                  >
                    {value.toLocaleString("fr-FR")}/20
                  </output>
                </div>
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={value}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [`${serie}:${r.subjectCode}`]: Number(e.target.value) }))
                  }
                  className="mt-2 w-full accent-[var(--vert)]"
                />
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col items-center gap-5 lg:sticky lg:top-24 lg:self-start">
          <svg viewBox="0 0 200 118" className="w-full max-w-xs" aria-hidden>
            <path d={arc(0, juryFloor)} stroke="var(--danger-soft)" strokeWidth="18" fill="none" />
            <path d={arc(juryFloor, admission)} stroke="var(--soleil)" strokeWidth="18" fill="none" />
            {mentions.map((m, i) => (
              <path
                key={m.key}
                d={arc(m.min, m.max)}
                stroke="var(--vert)"
                strokeOpacity={0.35 + i * 0.2}
                strokeWidth="18"
                fill="none"
              />
            ))}
            <line
              x1="100"
              y1="100"
              x2={needle.x}
              y2={needle.y}
              stroke="var(--ink)"
              strokeWidth="5"
              strokeLinecap="round"
              style={{ transition: "all 300ms ease" }}
            />
            <circle cx="100" cy="100" r="9" fill="var(--ink)" />
            <text x="18" y="116" fontSize="10" fill="var(--ink-muted)" textAnchor="middle">
              0
            </text>
            <text x="182" y="116" fontSize="10" fill="var(--ink-muted)" textAnchor="middle">
              20
            </text>
          </svg>
          <p className="text-center">
            <span className="block text-sm font-semibold text-muted">Moyenne simulée</span>
            <span className="text-5xl font-extrabold tabular-nums">{fmt(average)}</span>
            <span className="text-xl font-bold text-muted">/20</span>
          </p>
          <div role="status" className={`flex w-full items-start gap-3 rounded-2xl p-4 ${toneClass}`}>
            <verdict.icon className="mt-0.5 size-6 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">{verdict.title}</p>
              <p className="mt-1 text-ink">{verdict.text}</p>
            </div>
          </div>
          <p className="text-center text-sm text-muted">
            Total des coefficients : {totalCoef}. Simulation indicative : les « autres disciplines » sont
            regroupées en attendant l&apos;arrêté officiel.
          </p>
        </div>
      </div>
    </div>
  );
}
