"use client";

import { FileUp, Send } from "lucide-react";
import { useRef, useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/app/ActionForm";
import { buttonClass } from "@/components/app/ui";
import { submitDocumentRequest } from "./actions";

const LABELS: Record<string, string> = {
  mvola: "MVola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
  bank_transfer: "Virement bancaire",
};

/** Formulaire de demande : moyen de paiement, référence et reçu (photo réduite dans le navigateur). */
export function RequestForm({ type, methods, amount }: { type: string; methods: string[]; amount: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!file.type.startsWith("image/") || !input.current) return;
    // Photo du reçu : réduite à 1600 px pour un envoi léger en 3G.
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return;
    const dt = new DataTransfer();
    dt.items.add(new File([blob], "recu.jpg", { type: "image/jpeg" }));
    input.current.files = dt.files;
  }

  return (
    <ActionForm action={submitDocumentRequest} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <div>
        <span className="text-sm font-semibold">Moyen de paiement</span>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {methods.map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="radio" name="method" value={m} className="peer sr-only" />
              <span className="flex h-11 items-center justify-center rounded-md border border-line-strong font-semibold transition-colors peer-checked:border-vert peer-checked:bg-vert-soft peer-checked:text-vert peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus-ring)]">
                {LABELS[m]}
              </span>
            </label>
          ))}
        </div>
        <FieldError name="method" />
      </div>
      <label className="block">
        <span className="text-sm font-semibold">Référence de la transaction</span>
        <input
          name="reference"
          required
          className="field-input mt-1.5 font-mono tracking-wide uppercase"
          placeholder="MP260915.1234.A56789"
        />
        <span className="mt-1 block text-xs text-muted">
          Montant à payer : {amount}. La référence figure sur le SMS de confirmation.
        </span>
        <FieldError name="reference" />
      </label>
      <div>
        <span className="text-sm font-semibold">Reçu de paiement</span>
        <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line-strong p-4 transition-colors hover:border-vert">
          <FileUp className="size-6 shrink-0 text-vert" />
          <span className="text-sm">
            <span className="block font-semibold">{fileName ?? "Photo ou capture du reçu, ou PDF"}</span>
            <span className="text-muted">JPG, PNG ou PDF · 3 Mo maximum</span>
          </span>
          <input
            ref={input}
            type="file"
            name="receipt"
            accept="image/jpeg,image/png,application/pdf"
            onChange={onFile}
            className="sr-only"
          />
        </label>
        <FieldError name="receipt" />
      </div>
      <SubmitButton className={`${buttonClass("primary")} w-full`}>
        <Send className="size-5" /> Envoyer la demande
      </SubmitButton>
    </ActionForm>
  );
}
