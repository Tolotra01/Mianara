import "server-only";
import { requireDb } from "@/db";
import { auditLogs, notifications } from "@/db/schema-gestion";
import { headers } from "next/headers";

/**
 * Base de travail des services : l'exécutable HTTP de `requireDb()`, ou la
 * transaction en cours. Les transactions du pilote WebSocket (utilisées par
 * `db:seed`, `db:seed:demo` et `requireTxDb()`) n'ont pas le même type de
 * résultat de requête : `requireTxDb()` se présente comme le client HTTP, et
 * `seed-demo.ts` fait un cast explicite en passant `tx` à ces services.
 */
export type Tx = Parameters<Parameters<ReturnType<typeof requireDb>["transaction"]>[0]>[0];
export type Executor = ReturnType<typeof requireDb> | Tx;

/**
 * Trace une action d'écriture : auteur, table, enregistrement, ancienne et
 * nouvelle valeur (RG-17). Passez la transaction en cours pour qu'elle soit
 * annulée avec l'action si celle-ci échoue.
 */
export async function audit(
  entry: {
    actorId: string | null;
    action: string;
    table?: string;
    recordId?: string | number;
    oldData?: unknown;
    newData?: unknown;
  },
  exec: Executor = requireDb(),
) {
  const ip = await currentIp();
  await exec.insert(auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    tableName: entry.table ?? null,
    recordId: entry.recordId != null ? String(entry.recordId) : null,
    oldData: stripSecrets(entry.oldData) ?? null,
    newData: stripSecrets(entry.newData) ?? null,
    ip,
  });
}

async function currentIp() {
  try {
    return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch {
    return null; // hors requête HTTP (script de chargement)
  }
}

function stripSecrets(data: unknown) {
  if (!data || typeof data !== "object") return data;
  const copy = { ...(data as Record<string, unknown>) };
  for (const key of ["passwordHash", "tempPasswordEnc", "receipt", "data", "qrToken"]) {
    if (key in copy) copy[key] = "[masqué]";
  }
  return copy;
}

/**
 * Notification dans l'espace de l'utilisateur. Les envois SMS et email sont
 * simulés dans les journaux du serveur tant qu'aucun fournisseur n'est branché.
 */
export async function notify(
  userId: string | null | undefined,
  message: { title: string; body: string; link?: string },
  exec: Executor = requireDb(),
) {
  if (!userId) return;
  await exec.insert(notifications).values({ userId, ...message, link: message.link ?? null });
  console.info(`[notification simulée SMS/email] ${userId} — ${message.title}`);
}

/** Même message à plusieurs utilisateurs, en une seule écriture (publication, emploi du temps…). */
export async function notifyMany(
  userIds: (string | null | undefined)[],
  message: { title: string; body: string; link?: string },
  exec: Executor = requireDb(),
) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  for (let i = 0; i < ids.length; i += 1000) {
    await exec
      .insert(notifications)
      .values(ids.slice(i, i + 1000).map((userId) => ({ userId, ...message, link: message.link ?? null })));
  }
  if (ids.length)
    console.info(`[notifications simulées SMS/email] ${ids.length} destinataire(s) — ${message.title}`);
}
