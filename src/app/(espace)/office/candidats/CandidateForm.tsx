"use client";

import { Camera, School, UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { buttonClass } from "@/components/app/ui";
import type { ActionState } from "@/lib/action";

type Values = {
  id?: string;
  lastName?: string;
  firstName?: string;
  gender?: string;
  birthDate?: string;
  birthPlace?: string;
  serieCode?: string;
  kind?: string;
  schoolName?: string | null;
  cin?: string | null;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
};

const SERIES = [
  { code: "L", name: "Littéraire" },
  { code: "S", name: "Scientifique" },
  { code: "OSE", name: "Organisation, Société, Économie" },
];

export function CandidateForm({
  action,
  values = {},
  submitLabel,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  values?: Values;
  submitLabel: string;
}) {
  const [kind, setKind] = useState(values.kind ?? "ecole");
  const editing = Boolean(values.id);

  return (
    <ActionForm action={action} className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <PhotoInput initial={values.photoUrl ?? null} />

      <div className="space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="t-overline mb-3 text-muted">Identité</legend>
          <Input
            name="lastName"
            label="Nom"
            defaultValue={values.lastName}
            autoComplete="family-name"
            className="uppercase"
          />
          <Input name="firstName" label="Prénoms" defaultValue={values.firstName} autoComplete="given-name" />
          <Input name="birthDate" label="Date de naissance" type="date" defaultValue={values.birthDate} />
          <Input name="birthPlace" label="Lieu de naissance" defaultValue={values.birthPlace} />
          <div>
            <span className="text-sm font-semibold">Sexe</span>
            <div className="mt-1.5 flex gap-2">
              {[
                ["F", "Féminin"],
                ["M", "Masculin"],
              ].map(([v, l]) => (
                <label key={v} className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={v}
                    defaultChecked={values.gender === v}
                    className="peer sr-only"
                  />
                  <span className="flex h-11 items-center justify-center rounded-md border border-line-strong font-semibold transition-colors peer-checked:border-vert peer-checked:bg-vert-soft peer-checked:text-vert peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus-ring)]">
                    {l}
                  </span>
                </label>
              ))}
            </div>
            <FieldError name="gender" />
          </div>
          <Input
            name="cin"
            label="N° CIN (facultatif)"
            defaultValue={values.cin ?? ""}
            hint="Si le candidat a 18 ans ou plus."
          />
        </fieldset>

        <fieldset>
          <legend className="t-overline mb-3 text-muted">Série {editing && "(non modifiable)"}</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {SERIES.map((s) => (
              <label key={s.code} className={editing ? "cursor-not-allowed" : "cursor-pointer"}>
                <input
                  type="radio"
                  name="serieCode"
                  value={s.code}
                  defaultChecked={values.serieCode === s.code}
                  disabled={editing}
                  className="peer sr-only"
                />
                <span className="flex items-center gap-3 rounded-xl border-2 border-line p-3 transition-all peer-checked:border-vert peer-checked:bg-vert-soft peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus-ring)] peer-disabled:opacity-60">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-raised text-lg font-extrabold text-vert shadow-sm">
                    {s.code}
                  </span>
                  <span className="text-sm leading-tight font-semibold">{s.name}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError name="serieCode" />
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="t-overline mb-3 text-muted">Candidature</legend>
          <div className="sm:col-span-2">
            <div className="flex gap-2">
              {[
                { v: "ecole", l: "Candidat d'école", icon: School },
                { v: "libre", l: "Candidat libre", icon: UserRound },
              ].map((o) => (
                <label key={o.v} className="cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    value={o.v}
                    checked={kind === o.v}
                    onChange={() => setKind(o.v)}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 font-semibold transition-colors peer-checked:border-vert peer-checked:bg-vert peer-checked:text-on-vert">
                    <o.icon className="size-4" /> {o.l}
                  </span>
                </label>
              ))}
            </div>
          </div>
          {kind === "ecole" && (
            <Input
              name="schoolName"
              label="Établissement"
              defaultValue={values.schoolName ?? ""}
              className="sm:col-span-2"
            />
          )}
          <Input
            name="phone"
            label="Téléphone (facultatif)"
            type="tel"
            defaultValue={values.phone ?? ""}
            hint="Pour les notifications par SMS."
          />
          <Input name="email" label="Email (facultatif)" type="email" defaultValue={values.email ?? ""} />
        </fieldset>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <SubmitButton className={buttonClass("primary")}>{submitLabel}</SubmitButton>
          {!editing && (
            <p className="text-sm text-muted">
              Le matricule, les identifiants et la convocation sont générés automatiquement.
            </p>
          )}
        </div>
      </div>
    </ActionForm>
  );
}

function Input({
  name,
  label,
  hint,
  className,
  ...props
}: React.ComponentProps<"input"> & { name: string; label: string; hint?: string }) {
  return (
    <div className={className?.includes("col-span") ? className : undefined}>
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className={`field-input mt-1.5 ${className?.includes("uppercase") ? "uppercase" : ""}`}
        {...props}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}

/** Photo d'identité : recadrée en 3:4 et compressée en JPEG dans le navigateur avant l'envoi. */
function PhotoInput({ initial }: { initial: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initial);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = await createImageBitmap(file);
    const ratio = 3 / 4;
    let sw = img.width;
    let sh = img.height;
    if (sw / sh > ratio) sw = sh * ratio;
    else sh = sw / ratio;
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 480;
    canvas
      .getContext("2d")!
      .drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, 360, 480);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || !input.current) return;
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "photo.jpg", { type: "image/jpeg" }));
    input.current.files = dt.files;
    setPreview(URL.createObjectURL(blob));
  }

  return (
    <div>
      <span className="text-sm font-semibold">Photo d&apos;identité</span>
      <label className="group mt-1.5 flex aspect-[3/4] w-full max-w-60 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line-strong bg-sunken text-center transition-colors hover:border-vert">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Aperçu de la photo" className="anim-fade size-full object-cover" />
        ) : (
          <>
            <Camera
              className="size-10 text-muted transition-transform group-hover:scale-110 group-hover:text-vert"
              aria-hidden
            />
            <span className="mt-2 px-4 text-sm font-semibold text-muted">Importer ou prendre une photo</span>
            <span className="text-xs text-muted">JPG ou PNG</span>
          </>
        )}
        <input
          ref={input}
          type="file"
          name="photo"
          accept="image/jpeg,image/png"
          capture="user"
          onChange={onChange}
          className="sr-only"
        />
      </label>
      {preview && <p className="mt-2 text-xs text-muted">Cliquez sur la photo pour la remplacer.</p>}
      <FieldError name="photo" />
    </div>
  );
}
