"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ModalButton } from "@/components/app/ConfirmAction";
import { SecretForm } from "@/components/app/SecretForm";
import { buttonClass } from "@/components/app/ui";
import { PHONE_INPUT } from "@/lib/phone";
import { createTeacher } from "./actions";

type Subject = { id: number; name: string };

/** Sélecteur de matières, commun à la création et à l'édition. */
export function SubjectPicker({
  subjects,
  selected = [],
  error,
}: {
  subjects: Subject[];
  selected?: number[];
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Matières enseignées</legend>
      <p className="mt-1 text-sm text-muted">Les cours publiés doivent porter sur ces matières.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {subjects.map((s) => (
          <label key={s.id} className="cursor-pointer">
            <input
              type="checkbox"
              name="subjectIds"
              value={s.id}
              defaultChecked={selected.includes(s.id)}
              className="peer sr-only"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm font-semibold transition-colors peer-checked:border-vert peer-checked:bg-vert-soft peer-checked:text-vert peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus-ring)]">
              {s.name}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm font-semibold text-danger">{error}</p>}
    </fieldset>
  );
}

export function TeacherCreate({ subjects }: { subjects: Subject[] }) {
  const [username, setUsername] = useState("");
  return (
    <ModalButton label="Nouvel enseignant" title="Nouvel enseignant libre" icon={<Plus className="size-5" />}>
      {(close) => (
        <SecretForm action={createTeacher} onClose={close}>
          <label className="block">
            <span className="text-sm font-semibold">Nom complet</span>
            <input
              name="fullName"
              required
              className="field-input mt-1.5"
              onChange={(e) => {
                const slug = e.target.value
                  .normalize("NFD")
                  .replace(/[̀-ͯ]/g, "")
                  .toLowerCase()
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .join(".");
                setUsername(slug ? `ens.${slug}` : "");
              }}
            />
            <FieldError name="fullName" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Identifiant de connexion</span>
            <input
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="field-input mt-1.5 font-mono"
            />
            <FieldError name="username" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Email</span>
              <input name="email" type="email" className="field-input mt-1.5" />
              <FieldError name="email" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Téléphone</span>
              <input name="phone" className="field-input mt-1.5" placeholder="034 00 000 00" {...PHONE_INPUT} />
              <FieldError name="phone" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Ville</span>
              <input name="city" className="field-input mt-1.5" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Années d&apos;expérience</span>
              <input name="yearsExperience" type="number" min={0} max={60} defaultValue={0} className="field-input mt-1.5" />
              <FieldError name="yearsExperience" />
            </label>
          </div>
          <SubjectPicker subjects={subjects} />
          <label className="block">
            <span className="text-sm font-semibold">Présentation</span>
            <textarea name="bio" rows={3} className="field-input mt-1.5" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={buttonClass("ghost")}>
              Annuler
            </button>
            <SubmitButton className={buttonClass("primary")}>Créer le compte</SubmitButton>
          </div>
        </SecretForm>
      )}
    </ModalButton>
  );
}
