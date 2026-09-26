import "server-only";
import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidates, documentRequests } from "@/db/schema-gestion";
import { getCurrentUser } from "./auth";

/** Accès à une demande : le candidat concerné, son Office, l'Admin. */
export async function requestAccess(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const user = await getCurrentUser();
  if (!user) return false;
  const [row] = await requireDb()
    .select({ userId: candidates.userId, officeId: candidates.officeId })
    .from(documentRequests)
    .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
    .where(eq(documentRequests.id, id));
  if (!row) return false;
  return (
    user.role === "admin" ||
    row.userId === user.id ||
    (user.role === "office" && user.officeId === row.officeId)
  );
}
