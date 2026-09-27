import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "@/db";
import { users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { LearnError, learnHandler, learnJson, learnUser, readJson } from "@/lib/learn-api";
import { checkPassword, hashPassword, passwordProblem } from "@/lib/password";

const Body = z.object({ currentPassword: z.string().min(1), newPassword: z.string() });

/** Changement du mot de passe (obligatoire après le mot de passe temporaire de la convocation). */
export const POST = learnHandler(async (request: Request) => {
  const { user } = await learnUser(request, { allowPasswordChange: true });
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) throw new LearnError(400, "INVALID", "Formulaire incomplet.");
  const problem = passwordProblem(parsed.data.newPassword);
  if (problem) throw new LearnError(400, "WEAK_PASSWORD", problem);
  const db = requireDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!row || !(await checkPassword(parsed.data.currentPassword, row.hash)))
    throw new LearnError(400, "WRONG_PASSWORD", "Mot de passe actuel incorrect.");
  if (parsed.data.currentPassword === parsed.data.newPassword)
    throw new LearnError(400, "SAME_PASSWORD", "Choisissez un mot de passe différent.");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false })
    .where(eq(users.id, user.id));
  await audit({
    actorId: user.id,
    action: "compte.changer_mot_de_passe",
    table: "users",
    recordId: user.id,
    newData: { channel: "mobile-apprentissage" },
  });
  return learnJson({ changed: true });
});
