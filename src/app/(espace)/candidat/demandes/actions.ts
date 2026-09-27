"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { requireCandidate } from "@/lib/auth";
import { eligibility, METHODS, submitRequest } from "@/lib/services/requests";

const Input = z.object({
  type: z.enum(["transcript", "diploma"]),
  method: z.enum(["mvola", "orange_money", "airtel_money", "bank_transfer"], {
    error: "Choisissez le moyen de paiement.",
  }),
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.\-/]{6,40}$/, "Référence de transaction invalide (6 à 40 caractères, sans espace)."),
});

const MAX_RECEIPT = 3 * 1024 * 1024;

export async function submitDocumentRequest(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, candidate } = await requireCandidate();
  const parsed = Input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const { type, method, reference } = parsed.data;
  if (!METHODS[type].includes(method))
    return fail("Moyen de paiement non accepté pour ce document.", { method: "Non accepté." });

  const file = form.get("receipt");
  if (!(file instanceof File) || file.size === 0)
    return fail("Joignez le reçu de paiement.", { receipt: "Reçu obligatoire." });
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type))
    return fail("Reçu : photo JPG/PNG ou PDF.", { receipt: "Format non accepté." });
  if (file.size > MAX_RECEIPT) return fail("Reçu trop lourd (3 Mo maximum).", { receipt: "3 Mo maximum." });

  const db = requireDb();
  const open = await eligibility(candidate.id, type, db);
  if (!open.open) return fail(open.reason);

  const data = Buffer.from(await file.arrayBuffer());
  try {
    await requireTxDb().transaction((tx) =>
      submitRequest(
        candidate.id,
        user.id,
        type,
        { method, reference, receipt: { mime: file.type, data } },
        tx,
      ),
    );
  } catch (err) {
    // Référence unique : un même reçu ne peut pas servir deux fois.
    if (
      String((err as { cause?: { code?: string } })?.cause?.code ?? (err as { code?: string })?.code) ===
      "23505"
    ) {
      return fail("Cette référence de paiement a déjà été utilisée.", {
        reference: "Référence déjà utilisée.",
      });
    }
    throw err;
  }
  refresh();
  return ok("Demande envoyée. Téléchargez votre ticket de paiement.");
}
