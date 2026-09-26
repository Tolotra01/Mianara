"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/app/ActionForm";
import { Avatar, buttonClass, StatusBadge, type Tone } from "@/components/app/ui";

type Row = {
  id: string;
  name: string;
  school: string;
  serie: string;
  pieces: number;
  photo: boolean;
  status: { label: string; tone: Tone };
  selectable: boolean;
  sentAt: string;
};

/** Tableau des dossiers avec sélection multiple et validation groupée. */
export function BulkValidate({
  rows,
  action,
}: {
  rows: Row[];
  action: Parameters<typeof ActionForm>[0]["action"];
}) {
  const selectable = rows.filter((r) => r.selectable).map((r) => r.id);
  const [selected, setSelected] = useState<string[]>([]);
  const all = selectable.length > 0 && selected.length === selectable.length;

  return (
    <ActionForm action={action} onSuccess={() => setSelected([])}>
      {selected.map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={all}
                  disabled={!selectable.length}
                  onChange={() => setSelected(all ? [] : selectable)}
                  className="size-4 accent-[var(--vert)]"
                />
              </th>
              <th>Élève</th>
              <th>École</th>
              <th>Série</th>
              <th>Pièces</th>
              <th>État</th>
              <th>Envoyé le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={selected.includes(r.id) ? "bg-vert-soft/50" : ""}>
                <td>
                  {r.selectable && (
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${r.name}`}
                      checked={selected.includes(r.id)}
                      onChange={() =>
                        setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))
                      }
                      className="size-4 accent-[var(--vert)]"
                    />
                  )}
                </td>
                <td>
                  <Link
                    href={`/office/dossiers/${r.id}`}
                    className="flex items-center gap-3 font-bold hover:text-vert"
                  >
                    <Avatar name={r.name} src={r.photo ? `/api/dossiers/${r.id}/photo` : null} size={34} />
                    {r.name}
                  </Link>
                </td>
                <td className="max-w-48 truncate">{r.school}</td>
                <td className="font-bold">{r.serie}</td>
                <td className={`tabular-nums ${r.pieces < 6 ? "font-bold text-warning" : ""}`}>
                  {r.pieces}/6
                </td>
                <td>
                  <StatusBadge tone={r.status.tone}>{r.status.label}</StatusBadge>
                </td>
                <td className="whitespace-nowrap text-muted">{r.sentAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectable.length > 0 && (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-raised/95 px-5 py-3 backdrop-blur">
          <p className="text-sm text-muted">
            {selected.length
              ? `${selected.length} dossier(s) sélectionné(s)`
              : "Cochez les dossiers complets à valider."}
          </p>
          <SubmitButton className={buttonClass("primary")} disabled={!selected.length}>
            <CircleCheck className="size-5" /> Valider et convoquer
          </SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}
