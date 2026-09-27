"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { buttonClass } from "@/components/app/ui";
import { cancelReservation, reserveCourse } from "./actions";

type Course = {
  id: number;
  teacherName: string;
  free: boolean;
  /** Réservation du candidat sur ce cours : statut, ou identifiant si en attente. */
  mine: "pending" | "confirmed" | { id: number } | null;
};

/** Réservation en ligne, avec un message libre pour l'enseignant. */
export function ReserveButton({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);

  if (course.mine === "confirmed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-vert-soft px-3 py-2 text-sm font-semibold text-vert">
        <GraduationCap className="size-4" /> Place confirmée
      </span>
    );

  if (course.mine && typeof course.mine === "object")
    return (
      <ConfirmAction
        action={cancelReservation}
        fields={{ id: String(course.mine.id) }}
        variant="secondary"
        size="sm"
        label="Annuler ma réservation"
        title="Annuler votre réservation ?"
        description="La place est libérée et l'enseignant reçoit un avis."
      />
    );

  if (course.mine === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-soleil px-3 py-2 text-sm font-semibold text-ink">
        En attente de confirmation
      </span>
    );

  return (
    <>
      <button type="button" className={buttonClass("primary", "sm")} onClick={() => setOpen((o) => !o)}>
        Réserver ce cours
      </button>
      {open && (
        <div className="mt-3 border-t border-line pt-3">
          <ActionForm action={reserveCourse} onSuccess={() => setOpen(false)} className="space-y-3">
            <input type="hidden" name="courseId" value={course.id} />
            <label className="block">
              <span className="text-sm font-semibold">Message à {course.teacherName} (facultatif)</span>
              <textarea
                name="message"
                rows={3}
                maxLength={500}
                placeholder="Votre niveau actuel, vos disponibilités…"
                className="field-input mt-1.5"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setOpen(false)}>
                Annuler
              </button>
              <button type="submit" className={buttonClass("primary", "sm")}>
                Confirmer la réservation
              </button>
            </div>
          </ActionForm>
        </div>
      )}
    </>
  );
}
