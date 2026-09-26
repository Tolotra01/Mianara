"use client";

import { CircleAlert, PartyPopper, Scale, Sprout } from "lucide-react";
import { useMemo, useState } from "react";
import type { SerieCode } from "@/content/bac";
import type { Coefficient } from "@/lib/data";
import { COMMON, mentionLabel, type Lang } from "@/lib/i18n";
import { subjectName } from "@/lib/i18n-content";

type Mention = { key: string; label: string; min: number; max: number };

type Props = {
  series: { code: SerieCode; name: string }[];
  coefficients: Coefficient[];
  mentions: readonly Mention[];
  admission: number;
  juryFloor: number;
  initialSerie: SerieCode;
  lang?: Lang;
};

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const T = {
  fr: {
    zeroTitle: "Note éliminatoire",
    zeroText: "Un 0 à une épreuve est éliminatoire, sauf décision du jury.",
    admitted: "Admis · mention",
    admittedText: "Bravo ! Continue comme ça jusqu'au jour J.",
    juryTitle: "Entre les mains du jury",
    juryText: (floor: string) => `Le jury peut abaisser le seuil jusqu'à ${floor}. Mieux vaut viser 10.`,
    notYetTitle: "Pas encore admis",
    notYetText: "Chaque point compte : commence par les matières à coefficient 5.",
    average: "Moyenne simulée",
    total: (n: number) =>
      `Total des coefficients : ${n}. Simulation indicative : les « autres disciplines » sont regroupées en attendant l'arrêté officiel.`,
  },
  mg: {
    zeroTitle: "Naoty manala",
    zeroText: "Manala ny 0 amin'ny fanadinana iray, afa-tsy raha manapa-kevitra hafa ny mpitsara.",
    admitted: "Afaka · mention",
    admittedText: "Arahabaina ! Tohizo toy izao hatramin'ny andro J.",
    juryTitle: "Eo am-pelatanan'ny mpitsara",
    juryText: (floor: string) =>
      `Afaka mampidina ny fetra hatramin'ny ${floor} ny mpitsara. Aleo ny 10 no kendrena.`,
    notYetTitle: "Mbola tsy afaka",
    notYetText: "Manan-danja ny isa tsirairay : atombohy amin'ireo taranja coefficient 5.",
    average: "Salan'isa kajiana",
    total: (n: number) =>
      `Totalin'ny coefficient : ${n}. Fikajiana ho fanoroana fotsiny : atambatra ny « taranja hafa » mandra-pivoakan'ny didim-pitondrana ofisialy.`,
  },
};

/** Simulateur : moyenne = Σ(note × coefficient) / Σ coefficients (décret 2021-242). */
export function MoyenneSimulator({
  series,
  coefficients,
  mentions,
  admission,
  juryFloor,
  initialSerie,
  lang = "fr",
}: Props) {
  const t = T[lang];
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
        title: t.zeroTitle,
        text: t.zeroText,
      }
    : average >= admission
      ? {
          tone: "success",
          icon: PartyPopper,
          title: `${t.admitted} ${mention ? mentionLabel(mention.key, mention.label, lang) : ""}`,
          text: t.admittedText,
        }
      : average >= juryFloor
        ? {
            tone: "warning",
            icon: Scale,
            title: t.juryTitle,
            text: t.juryText(fmt(juryFloor)),
          }
        : {
            tone: "info",
            icon: Sprout,
            title: t.notYetTitle,
            text: t.notYetText,
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
      <div
        role="tablist"
        aria-label={COMMON[lang].series}
        className="flex gap-2 border-b border-line bg-sunken p-3"
      >
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
                    {subjectName(r.subjectCode, r.subjectName, lang)}
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
            <span className="block text-sm font-semibold text-muted">{t.average}</span>
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
          <p className="text-center text-sm text-muted">{t.total(totalCoef)}</p>
        </div>
      </div>
    </div>
  );
}
