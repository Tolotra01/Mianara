import "server-only";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { examSessions } from "@/db/schema";
import { blacklist, candidates, documentRequests, payments, results, users } from "@/db/schema-gestion";
import { audit, type Executor, notify, notifyMany } from "@/lib/audit";
import { formatRequestNumber } from "@/lib/bac-rules";

export type DocType = "transcript" | "diploma";
export type Eligibility = { open: true } | { open: false; reason: string; opensAt?: Date };

/** Moyens de paiement acceptés : Mobile Money pour le relevé, Mobile Money ou virement pour le diplôme. */
export const METHODS: Record<DocType, ("mvola" | "orange_money" | "airtel_money" | "bank_transfer")[]> = {
  transcript: ["mvola", "orange_money", "airtel_money"],
  diploma: ["mvola", "orange_money", "airtel_money", "bank_transfer"],
};

export async function activeBlacklist(candidateId: string, exec: Executor) {
  const today = new Date().toISOString().slice(0, 10);
  const [entry] = await exec
    .select()
    .from(blacklist)
    .where(
      and(
        eq(blacklist.candidateId, candidateId),
        isNull(blacklist.liftedAt),
        lte(blacklist.startsAt, today),
        or(isNull(blacklist.endsAt), gte(blacklist.endsAt, today)),
      ),
    )
    .limit(1);
  return entry ?? null;
}

/** RG-11, RG-12, RG-13 : ouverture des demandes. */
export async function eligibility(candidateId: string, type: DocType, exec: Executor): Promise<Eligibility> {
  const [row] = await exec
    .select({ session: examSessions, decision: results.decision })
    .from(candidates)
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .leftJoin(results, eq(results.candidateId, candidates.id))
    .where(eq(candidates.id, candidateId));
  if (!row) return { open: false, reason: "Candidat introuvable." };
  const { session } = row;
  const published = session.resultsPublishAt && session.resultsPublishAt <= new Date();
  if (!published) return { open: false, reason: "Les résultats ne sont pas encore publiés." };
  if (row.decision !== "admitted")
    return { open: false, reason: "Les demandes sont réservées aux candidats admis." };
  if (await activeBlacklist(candidateId, exec))
    return { open: false, reason: "Votre dossier est bloqué par l'Office du Bacc. Contactez-le." };

  const existing = await exec
    .select()
    .from(documentRequests)
    .where(eq(documentRequests.candidateId, candidateId));
  const mine = existing.find((r) => r.type === type);
  if (mine && mine.status !== "rejected") return { open: false, reason: "Une demande est déjà en cours." };

  if (type === "transcript") {
    const opensAt = new Date(session.resultsPublishAt!.getTime() + session.transcriptDelayDays * 86400000);
    if (opensAt > new Date()) {
      return {
        open: false,
        reason: `Les demandes de relevé ouvrent ${session.transcriptDelayDays} jours après la publication.`,
        opensAt,
      };
    }
  } else {
    const transcript = existing.find((r) => r.type === "transcript");
    if (transcript?.status !== "delivered")
      return { open: false, reason: "Le diplôme se demande après le retrait du relevé de notes." };
  }
  return { open: true };
}

export async function feeFor(candidateId: string, type: DocType, exec: Executor) {
  const [s] = await exec
    .select({ transcriptFee: examSessions.transcriptFee, diplomaFee: examSessions.diplomaFee })
    .from(candidates)
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .where(eq(candidates.id, candidateId));
  return type === "transcript" ? s.transcriptFee : s.diplomaFee;
}

type Payment = {
  method: "mvola" | "orange_money" | "airtel_money" | "bank_transfer";
  reference: string;
  receipt: { mime: string; data: Buffer };
};

/** CAN-08/09 : dépôt d'une demande avec son reçu de paiement (ou nouveau dépôt après un rejet). */
export async function submitRequest(
  candidateId: string,
  userId: string,
  type: DocType,
  payment: Payment,
  exec: Executor,
) {
  const [c] = await exec
    .select({ officeId: candidates.officeId, year: examSessions.year })
    .from(candidates)
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .where(eq(candidates.id, candidateId));
  const amount = await feeFor(candidateId, type, exec);
  // Voir `candidates.ts` : `execute()` renvoie un NeonHttpQueryResult, la ligne
  // se lit dans `.rows`.
  const [{ n }] = (await exec.execute<{ n: string }>(sql`select nextval('request_number_seq') as n`)).rows;
  const [previous] = await exec
    .select()
    .from(documentRequests)
    .where(and(eq(documentRequests.candidateId, candidateId), eq(documentRequests.type, type)));

  let request;
  if (previous) {
    [request] = await exec
      .update(documentRequests)
      .set({
        status: "pending",
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(documentRequests.id, previous.id))
      .returning();
    await exec.delete(payments).where(eq(payments.requestId, previous.id));
  } else {
    [request] = await exec
      .insert(documentRequests)
      .values({ number: formatRequestNumber(type, c.year, Number(n)), candidateId, type })
      .returning();
  }
  const [pay] = await exec
    .insert(payments)
    .values({
      requestId: request.id,
      method: payment.method,
      reference: payment.reference,
      amount,
      receiptMime: payment.receipt.mime,
      receipt: payment.receipt.data,
      ticketNumber: `TCK-${c.year}-${String(n).padStart(6, "0")}`,
    })
    .returning({ ticketNumber: payments.ticketNumber });

  await audit(
    {
      actorId: userId,
      action: "demande.creer",
      table: "document_requests",
      recordId: request.id,
      newData: { type, method: payment.method, reference: payment.reference, amount },
    },
    exec,
  );
  await notify(
    userId,
    {
      title: "Demande reçue",
      body: `Votre demande ${request.number} est enregistrée. L'Office vérifie votre paiement.`,
      link: "/candidat/demandes",
    },
    exec,
  );
  const agents = await exec
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "office"), eq(users.officeId, c.officeId)));
  await notifyMany(
    agents.map((a) => a.id),
    {
      title: "Nouvelle demande de document",
      body: `${request.number} : paiement à vérifier.`,
      link: `/office/demandes/${request.id}`,
    },
    exec,
  );
  return { request, ticketNumber: pay.ticketNumber };
}
