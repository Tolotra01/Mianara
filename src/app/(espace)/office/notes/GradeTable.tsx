"use client";

import { Save } from "lucide-react";
import { ActionForm, SubmitButton, useFormResult } from "@/components/app/ActionForm";
import { buttonClass } from "@/components/app/ui";
import { saveGrades } from "./actions";

type Row = { id: string; matricule: string; score: number | null; absent: boolean };

/** Saisie rapide : Entrée passe à la note suivante, les candidats ne sont identifiés que par leur matricule. */
export function GradeTable({
  rows,
  serie,
  subjectId,
  locked,
}: {
  rows: Row[];
  serie: string;
  subjectId: number;
  locked: boolean;
}) {
  return (
    <ActionForm action={saveGrades}>
      <input type="hidden" name="serie" value={serie} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-16">N°</th>
              <th>Matricule (anonymat)</th>
              <th className="w-48">Note /20</th>
              <th>Remarque</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <GradeRow key={r.id} row={r} index={i} locked={locked} />
            ))}
          </tbody>
        </table>
      </div>
      {!locked && rows.length > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-raised/95 px-5 py-3 backdrop-blur">
          <p className="text-sm text-muted">Laissez vide une note non encore corrigée. Une absence vaut 0.</p>
          <SubmitButton className={buttonClass("primary")}>
            <Save className="size-5" /> Enregistrer les notes
          </SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}

function GradeRow({ row, index, locked }: { row: Row; index: number; locked: boolean }) {
  const { state } = useFormResult();
  const error = state && !state.ok ? state.fieldErrors?.[`note:${row.id}`] : undefined;
  return (
    <tr>
      <td className="text-muted tabular-nums">{index + 1}</td>
      <td className="font-mono font-semibold tracking-wide">{row.matricule}</td>
      <td>
        <input
          name={`note:${row.id}`}
          defaultValue={row.score ?? ""}
          inputMode="decimal"
          disabled={locked}
          aria-invalid={Boolean(error)}
          aria-label={`Note de ${row.matricule}`}
          className="field-input h-10 w-28 text-right font-bold tabular-nums"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const inputs = [...document.querySelectorAll<HTMLInputElement>('input[name^="note:"]')];
              inputs[inputs.indexOf(e.currentTarget) + 1]?.focus();
            }
          }}
        />
        {error && <p className="mt-1 text-xs font-semibold text-danger">{error}</p>}
      </td>
      <td className="text-sm text-muted">{row.absent ? "Aucune entrée scannée à cette épreuve" : ""}</td>
    </tr>
  );
}
