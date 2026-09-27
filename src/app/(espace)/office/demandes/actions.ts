"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireDb, requireTxDb } from "@/db";
import { candidates, documentRequests, payments, scans } from "@/db/schema-gestion";
import { type ActionState, fail, ok } from "@/lib/action";
import { audit, notify } from "@/lib/audit";
import { requireOfficeAgent } from "@/lib/auth";
import { formatDateTime, parseLocalDateTime } from "@/lib/bac-rules";
import { DOC_LABEL } from "@/lib/labels";
import { activeBlacklist } from "@/lib/services/requests";

async function load(id: string) {
  const user = await requireOfficeAgent();
  const db = requireDb();
  const [row] = await db
    .select({ r: documentRequests, c: candidates, p: payments })
    .from(documentRequests)
    .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
    .leftJoin(payments, eq(payments.requestId, documentRequests.id))
    .where(and(eq(documentRequests.id, id), eq(candidates.officeId, user.officeId)));
  return { user, db, row };
}

/** OFF-09 : paiement vérifié, demande validée. */
export async function validateRequest(_: ActionState, form: FormData): Promise<ActionState> {
  const { user, db, row } = await load(String(form.get("id")));
  if (!row) return fail("Demande introuvable.");
  if (row.r.status !== "pending") return fail("Cette demande a déjà été traitée.");
  if (await activeBlacklist(row.c.id, db))
    return fail("Candidat en liste noire : la demande doit être rejetée.");
  await requireTxDb().transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "verified", verifiedBy: user.id, verifiedAt: new Date() })
      .where(eq(payments.requestId, row.r.id));
    await tx
      .update(documentRequests)
      .set({ status: "validated", reviewedBy: user.id, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(documentRequests.id, row.r.id));
    await audit(
      { actorId: user.id, action: "demande.valider", table: "document_requests", recordId: row.r.id },
      tx,
    );
    await notify(
      row.c.userId,
      {
        title: "Paiement vérifié",
        body: `Votre demande ${row.r.number} est validée. La date de retrait vous sera communiquée.`,
        link: "/candidat/demandes",
      },
      tx,
    );
  });
  refresh();
  return ok("Paiement vérifié, demande validée.");
}

export async function rejectRequest(_: ActionState, form: FormData): Promise<ActionState> {
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 5) return fail("Indiquez le motif du rejet.");
  const { user, row } = await load(String(form.get("id")));
  if (!row) return fail("Demande introuvable.");
  if (!["pending", "validated"].includes(row.r.status))
    return fail("Cette demande ne peut plus être rejetée.");
  await requireTxDb().transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ status: "rejected", verifiedBy: user.id, verifiedAt: new Date() })
      .where(eq(payments.requestId, row.r.id));
    await tx
      .update(documentRequests)
      .set({
        status: "rejected",
        rejectionReason: reason,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(documentRequests.id, row.r.id));
    await audit(
      {
        actorId: user.id,
        action: "demande.rejeter",
        table: "document_requests",
        recordId: row.r.id,
        newData: { reason },
      },
      tx,
    );
    await notify(
      row.c.userId,
      {
        title: "Demande rejetée",
        body: `${row.r.number} : ${reason}. Vous pouvez déposer une nouvelle demande.`,
        link: "/candidat/demandes",
      },
      tx,
    );
  });
  refresh();
  return ok("Demande rejetée : le candidat est prévenu.");
}

const Pickup = z.object({
  pickupAt: z.string(),
  pickupPlace: z.string().trim().min(3, "Précisez le lieu de retrait.").max(160),
});

/** Date, heure et lieu de retrait au guichet (notification SMS, email et dans l'espace). */
export async function schedulePickup(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = Pickup.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const at = parseLocalDateTime(parsed.data.pickupAt);
  if (!at || at <= new Date()) return fail("Choisissez une date de retrait à venir.");
  const { user, row } = await load(String(form.get("id")));
  if (!row) return fail("Demande introuvable.");
  if (!["validated", "pickup_scheduled"].includes(row.r.status)) return fail("Validez d'abord le paiement.");
  await requireTxDb().transaction(async (tx) => {
    await tx
      .update(documentRequests)
      .set({
        status: "pickup_scheduled",
        pickupAt: at,
        pickupPlace: parsed.data.pickupPlace,
        updatedAt: new Date(),
      })
      .where(eq(documentRequests.id, row.r.id));
    await audit(
      {
        actorId: user.id,
        action: "demande.planifier",
        table: "document_requests",
        recordId: row.r.id,
        newData: { pickupAt: at, place: parsed.data.pickupPlace },
      },
      tx,
    );
    await notify(
      row.c.userId,
      {
        title: `${DOC_LABEL[row.r.type]} : retrait fixé`,
        body: `Présentez-vous le ${formatDateTime(at)} à ${parsed.data.pickupPlace}, avec votre convocation et une pièce d'identité.`,
        link: "/candidat/demandes",
      },
      tx,
    );
  });
  refresh();
  return ok(`Retrait fixé le ${formatDateTime(at)}.`);
}

/**
 * OFF-10 : remise du document au guichet, après contrôle d'identité.
 * (L'application mobile confirmera la remise par scan de la convocation.)
 */
export async function markDelivered(_: ActionState, form: FormData): Promise<ActionState> {
  if (form.get("identity") !== "on") return fail("Confirmez le contrôle de l'identité du candidat.");
  const { user, row } = await load(String(form.get("id")));
  if (!row) return fail("Demande introuvable.");
  if (row.r.status !== "pickup_scheduled") return fail("Aucun retrait n'est prévu pour cette demande.");
  const now = new Date();
  await requireTxDb().transaction(async (tx) => {
    await tx
      .update(documentRequests)
      .set({ status: "delivered", deliveredAt: now, deliveredBy: user.id, updatedAt: now })
      .where(eq(documentRequests.id, row.r.id));
    await tx.insert(scans).values({
      candidateId: row.c.id,
      requestId: row.r.id,
      scannedBy: user.id,
      type: "doc_delivery",
      scannedAt: now,
    });
    await audit(
      { actorId: user.id, action: "demande.remettre", table: "document_requests", recordId: row.r.id },
      tx,
    );
    await notify(
      row.c.userId,
      {
        title: `${DOC_LABEL[row.r.type]} retiré`,
        body:
          row.r.type === "transcript"
            ? "Relevé remis. Vous pouvez maintenant demander votre diplôme."
            : "Diplôme remis. Félicitations et bonne continuation !",
        link: "/candidat/demandes",
      },
      tx,
    );
  });
  refresh();
  return ok(`${DOC_LABEL[row.r.type]} remis : retrait enregistré.`);
}
