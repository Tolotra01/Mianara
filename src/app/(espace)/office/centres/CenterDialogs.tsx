"use client";

import { Plus } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { buttonClass } from "@/components/app/ui";
import { createCenter, createRoom } from "./actions";

export function NewCenterDialog() {
  return (
    <ModalButton label="Nouveau centre" title="Nouveau centre d'examen" icon={<Plus className="size-5" />}>
      {(close) => (
        <ActionForm action={createCenter} onSuccess={close} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Nom</span>
            <input
              name="name"
              required
              className="field-input mt-1.5"
              placeholder="Lycée Jean-Joseph Rabearivelo"
            />
            <FieldError name="name" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Ville</span>
              <input name="city" required className="field-input mt-1.5" />
              <FieldError name="city" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Quartier / adresse</span>
              <input name="address" className="field-input mt-1.5" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton className={buttonClass("primary")}>Créer le centre</SubmitButton>
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function NewRoomDialog({ centerId, centerName }: { centerId: number; centerName: string }) {
  return (
    <ModalButton
      label="Salle"
      title={`Nouvelle salle · ${centerName}`}
      variant="secondary"
      size="sm"
      icon={<Plus className="size-4" />}
    >
      {(close) => (
        <ActionForm action={createRoom} onSuccess={close} className="space-y-4">
          <input type="hidden" name="centerId" value={centerId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Nom de la salle</span>
              <input name="name" required className="field-input mt-1.5" placeholder="Salle 3" />
              <FieldError name="name" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Capacité (places)</span>
              <input
                name="capacity"
                type="number"
                min={1}
                required
                defaultValue={30}
                className="field-input mt-1.5"
              />
              <FieldError name="capacity" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton className={buttonClass("primary")}>Ajouter</SubmitButton>
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}
