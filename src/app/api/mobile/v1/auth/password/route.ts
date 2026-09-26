import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireDb } from "@/db";
import { users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { ApiError, handler, json, mobileUser } from "@/lib/mobile-api";
import { checkPassword, hashPassword, passwordProblem } from "@/lib/password";

const Body = z.object({ current: z.string().min(1), next: z.string() });

/** Premier changement du mot de passe temporaire, depuis l'application. */
export const POST = handler(async (request: Request) => {
  const user = await mobileUser(request, { allowPasswordChange: true });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "INVALID", "Formulaire incomplet.");
  const problem = passwordProblem(parsed.data.next);
  if (problem) throw new ApiError(400, "WEAK_PASSWORD", problem);
  const db = requireDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!row || !(await checkPassword(parsed.data.current, row.hash)))
    throw new ApiError(400, "WRONG_PASSWORD", "Mot de passe actuel incorrect.");
  if (parsed.data.current === parsed.data.next)
    throw new ApiError(400, "SAME_PASSWORD", "Choisissez un mot de passe différent.");
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false })
    .where(eq(users.id, user.id));
  await audit({
    actorId: user.id,
    action: "compte.changer_mot_de_passe",
    table: "users",
    recordId: user.id,
    newData: { channel: "mobile" },
  });
  return json({ ok: true });
});
