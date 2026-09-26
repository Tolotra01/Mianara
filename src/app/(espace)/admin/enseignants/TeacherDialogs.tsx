"use client";

import { BadgeCheck, KeyRound, Pencil, Plus, Power } from "lucide-react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { ConfirmAction, ModalButton } from "@/components/app/ConfirmAction";
import { SecretForm } from "@/components/app/SecretForm";
import { buttonClass } from "@/components/app/ui";
import {
  createTeacher,
  resetTeacherPassword,
  setTeacherVerification,
  toggleTeacher,
  updateTeacher,
} from "./actions";

export type TeacherRow = {
  id: string;
  fullName: string;
  username: string;
  phone: string | null;
  email: string | null;
  subjectCode: string;
  verificationStatus: "pending" | "verified" | "rejected";
  isActive: boolean;
};

type Subject = { code: string; name: string };

function Field({
  name,
  label,
  defaultValue,
  required = true,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue ?? ""} className="field-input mt-1.5" />
      <FieldError name={name} />
    </label>
  );
}

function SubjectSelect({ subjects, value }: { subjects: Subject[]; value?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">Matière enseignée</span>
      <select name="subjectCode" required defaultValue={value ?? ""} className="field-input mt-1.5">
        <option value="" disabled>
          Choisir…
        </option>
        {subjects.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
      <FieldError name="subjectCode" />
    </label>
  );
}

function Actions({ close, label }: { close: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={close} className={buttonClass("ghost")}>
        Annuler
      </button>
      <SubmitButton className={buttonClass("primary")}>{label}</SubmitButton>
    </div>
  );
}

export function NewTeacherDialog({ subjects }: { subjects: Subject[] }) {
  return (
    <ModalButton label="Nouvel enseignant" title="Nouvel enseignant" icon={<Plus className="size-5" />}>
      {(close) => (
        <SecretForm action={createTeacher} onClose={close}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label="Nom complet" />
            <Field name="username" label="Identifiant de connexion" />
          </div>
          <SubjectSelect subjects={subjects} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="phone" label="Téléphone" type="tel" required={false} />
            <Field name="email" label="Email" type="email" required={false} />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-sunken p-3 text-sm">
            <input type="checkbox" name="verified" className="mt-0.5 size-4 accent-[var(--vert)]" />
            <span>
              <span className="font-semibold">Identité et diplômes déjà vérifiés</span>
              <span className="block text-muted">
                Sinon, l&apos;enseignant dépose ses justificatifs depuis son espace.
              </span>
            </span>
          </label>
          <Actions close={close} label="Créer le compte" />
        </SecretForm>
      )}
    </ModalButton>
  );
}

export function EditTeacherDialog({ teacher, subjects }: { teacher: TeacherRow; subjects: Subject[] }) {
  return (
    <ModalButton
      label={<span className="sr-only">Modifier</span>}
      title={`Modifier · ${teacher.fullName}`}
      variant="ghost"
      size="sm"
      icon={<Pencil className="size-4" aria-hidden />}
    >
      {(close) => (
        <ActionForm action={updateTeacher} onSuccess={close} className="space-y-4">
          <input type="hidden" name="id" value={teacher.id} />
          <Field name="fullName" label="Nom complet" defaultValue={teacher.fullName} />
          <SubjectSelect subjects={subjects} value={teacher.subjectCode} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="phone" label="Téléphone" type="tel" defaultValue={teacher.phone} required={false} />
            <Field name="email" label="Email" type="email" defaultValue={teacher.email} required={false} />
          </div>
          <Actions close={close} label="Enregistrer" />
        </ActionForm>
      )}
    </ModalButton>
  );
}

export function TeacherPasswordDialog({ teacher }: { teacher: TeacherRow }) {
  return (
    <ModalButton
      label={<span className="sr-only">Nouveau mot de passe</span>}
      title={`Nouveau mot de passe · ${teacher.fullName}`}
      variant="ghost"
      size="sm"
      icon={<KeyRound className="size-4" aria-hidden />}
    >
      {(close) => (
        <SecretForm action={resetTeacherPassword} onClose={close}>
          <input type="hidden" name="id" value={teacher.id} />
          <p className="text-sm text-muted">
            L&apos;ancien mot de passe ne fonctionnera plus et l&apos;enseignant sera déconnecté partout. Il
            choisira un nouveau mot de passe à sa prochaine connexion.
          </p>
          <Actions close={close} label="Générer" />
        </SecretForm>
      )}
    </ModalButton>
  );
}

export function TeacherVerificationActions({ teacher }: { teacher: TeacherRow }) {
  const decisions = [
    { status: "verified", label: "Vérifier", variant: "primary" as const },
    { status: "rejected", label: "Refuser", variant: "danger" as const },
    { status: "pending", label: "Remettre en attente", variant: "secondary" as const },
  ].filter((d) => d.status !== teacher.verificationStatus);
  return (
    <>
      {decisions.map((d) => (
        <ConfirmAction
          key={d.status}
          action={setTeacherVerification}
          fields={{ id: teacher.id, status: d.status }}
          label={d.label}
          title={`${d.label} · ${teacher.fullName} ?`}
          description={
            d.status === "verified"
              ? "Ses offres pourront être approuvées et proposées aux candidats."
              : d.status === "rejected"
                ? "Ses offres ne pourront pas être publiées tant que le profil est refusé."
                : "Le profil repasse en attente de vérification des justificatifs."
          }
          confirmLabel={d.label}
          variant={d.variant}
          size="sm"
          icon={d.status === "verified" ? <BadgeCheck className="size-4" /> : undefined}
        />
      ))}
    </>
  );
}

export function TeacherAccessAction({ teacher }: { teacher: TeacherRow }) {
  return (
    <ConfirmAction
      action={toggleTeacher}
      fields={{ id: teacher.id }}
      label={<span className="sr-only">{teacher.isActive ? "Désactiver" : "Réactiver"}</span>}
      title={teacher.isActive ? `Désactiver ${teacher.fullName} ?` : `Réactiver ${teacher.fullName} ?`}
      description={
        teacher.isActive
          ? "L'enseignant est déconnecté et ne peut plus se connecter. Ses offres et séances sont conservées."
          : "L'enseignant pourra de nouveau se connecter."
      }
      confirmLabel={teacher.isActive ? "Désactiver" : "Réactiver"}
      variant="ghost"
      size="sm"
      icon={<Power className={`size-4 ${teacher.isActive ? "text-danger" : "text-vert"}`} aria-hidden />}
    />
  );
}
