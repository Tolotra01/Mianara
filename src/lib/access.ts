import "server-only";
import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidates } from "@/db/schema-gestion";
import type { CurrentUser } from "./auth";

/** Qui peut voir un candidat : lui-même, son Office (agents et surveillants), l'Admin. */
export async function canAccessCandidate(user: CurrentUser, candidateId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(candidateId)) return false;
  const [c] = await requireDb()
    .select({ officeId: candidates.officeId, userId: candidates.userId })
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!c) return false;
  if (user.role === "admin") return true;
  if (user.role === "candidate") return c.userId === user.id;
  return user.officeId === c.officeId;
}
