"use client";

import { Pencil, Plus } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { buttonClass } from "@/components/app/ui";
import { saveNews } from "../actions";

type News = {
  id: number;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  importance: string;
  illustration: string;
  publishedAt: string | null;
};

const ILLUSTRATIONS = [
  ["reforme", "Orientation"],
  ["calendrier", "Calendrier"],
  ["coefficients", "Coefficients"],
  ["inscription", "Dossier"],
  ["sport", "Épreuves"],
  ["resultats", "Résultats"],
];

export function NewsDialog({ item }: { item?: News }) {
  return (
    <ModalButton
      label={item ? <span className="sr-only">Modifier</span> : "Nouvelle actualité"}
      title={item ? "Modifier l'actualité" : "Nouvelle actualité"}
      variant={item ? "ghost" : "primary"}
      size={item ? "sm" : "md"}
      icon={item ? <Pencil className="size-4" aria-hidden /> : <Plus className="size-5" />}
    >
      {(close) => (
        <ActionForm action={saveNews} onSuccess={close} className="space-y-4">
          {item && <input type="hidden" name="id" value={item.id} />}
          <label className="block">
            <span className="text-sm font-semibold">Titre</span>
            <input name="title" required defaultValue={item?.title} className="field-input mt-1.5" />
            <FieldError name="title" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Résumé</span>
            <input name="excerpt" required defaultValue={item?.excerpt} className="field-input mt-1.5" />
            <FieldError name="excerpt" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Texte (paragraphes séparés par une ligne vide)</span>
            <textarea
              name="body"
              required
              rows={6}
              defaultValue={item?.body}
              className="field-input mt-1.5"
            />
            <FieldError name="body" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold">Catégorie</span>
              <input
                name="category"
                required
                defaultValue={item?.category ?? "Office du Bac"}
                className="field-input mt-1.5"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Importance</span>
              <select
                name="importance"
                defaultValue={item?.importance ?? "normal"}
                className="field-input mt-1.5"
              >
                <option value="low">Faible</option>
                <option value="normal">Normale</option>
                <option value="high">À savoir</option>
                <option value="urgent">Important</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Illustration</span>
              <select
                name="illustration"
                defaultValue={item?.illustration ?? "calendrier"}
                className="field-input mt-1.5"
              >
                {ILLUSTRATIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="publish"
              defaultChecked={item ? Boolean(item.publishedAt) : true}
              className="size-4 accent-[var(--vert)]"
            />
            Publier sur le site public
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton className={buttonClass("primary")}>Enregistrer</SubmitButton>
          </div>
        </ActionForm>
      )}
    </ModalButton>
  );
}
