"use client";

import { Pencil, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { buttonClass } from "@/components/app/ui";
import { saveItem } from "./actions";

type Item = {
  id: string;
  kind: string;
  title: string;
  description: string;
  content: string;
  priceAmount: number | null;
  durationMinutes: number | null;
};

const HINT: Record<string, string> = {
  course: "Leçon à lire dans l'application, même hors connexion une fois acquise.",
  training: "Exercices ou sujets d'annales, avec leurs corrigés.",
  coaching: "Offre de tutorat : l'élève paie, puis échange avec vous dans le chat.",
};

export function ItemDialog({ item, subjectName }: { item?: Item; subjectName: string }) {
  return (
    <ModalButton
      label={item ? <span className="sr-only">Modifier</span> : "Nouveau contenu"}
      title={item ? `Modifier · ${item.title}` : `Nouveau contenu · ${subjectName}`}
      variant={item ? "ghost" : "primary"}
      size={item ? "sm" : "md"}
      icon={item ? <Pencil className="size-4" /> : <Plus className="size-5" />}
    >
      {(close) => <Form item={item} close={close} />}
    </ModalButton>
  );
}

function Form({ item, close }: { item?: Item; close: () => void }) {
  const [kind, setKind] = useState(item?.kind ?? "course");
  // Bouton cliqué : brouillon (0) ou envoi à la validation (1).
  const flag = useRef<HTMLInputElement>(null);
  return (
    <ActionForm action={saveItem} onSuccess={close} className="w-[min(46rem,85vw)] space-y-4">
      {(ctx) => (
        <>
          {item && <input type="hidden" name="id" value={item.id} />}
          <input ref={flag} type="hidden" name="submit" defaultValue="0" />
          <fieldset>
            <legend className="text-sm font-semibold">Type</legend>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
              {(["course", "training", "coaching"] as const).map((k) => (
                <label
                  key={k}
                  className={`cursor-pointer rounded-xl border-2 p-3 text-sm ${kind === k ? "border-vert bg-vert-soft" : "border-line"}`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                    className="sr-only"
                  />
                  <span className="font-bold">
                    {k === "course" ? "Cours" : k === "training" ? "Exercices" : "Tutorat"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{HINT[k]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-sm font-semibold">Titre</span>
            <input name="title" required defaultValue={item?.title} className="field-input mt-1.5" />
            <FieldError name="title" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Présentation (visible avant achat)</span>
            <textarea
              name="description"
              required
              rows={2}
              defaultValue={item?.description}
              className="field-input mt-1.5"
            />
            <FieldError name="description" />
          </label>
          {kind !== "coaching" && (
            <label className="block">
              <span className="text-sm font-semibold">Contenu</span>
              <textarea
                name="content"
                rows={10}
                defaultValue={item?.content}
                placeholder={"Titres avec #, listes avec -, **gras**…"}
                className="field-input mt-1.5 font-mono text-sm"
              />
              <FieldError name="content" />
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Prix (Ar)</span>
              <input
                name="priceAmount"
                type="number"
                min={0}
                step={500}
                defaultValue={item?.priceAmount ?? ""}
                placeholder={kind === "coaching" ? "5000" : "Vide = gratuit"}
                className="field-input mt-1.5"
              />
              <FieldError name="priceAmount" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">
                {kind === "coaching" ? "Durée de la séance (min)" : "Durée estimée (min)"}
              </span>
              <input
                name="durationMinutes"
                type="number"
                min={0}
                max={600}
                defaultValue={item?.durationMinutes ?? ""}
                className="field-input mt-1.5"
              />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton
              className={buttonClass("secondary")}
              disabled={ctx.pending}
              onClick={() => flag.current && (flag.current.value = "0")}
            >
              Enregistrer le brouillon
            </SubmitButton>
            <SubmitButton
              className={buttonClass("primary")}
              onClick={() => flag.current && (flag.current.value = "1")}
            >
              Envoyer à la validation
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
