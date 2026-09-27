import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidates, users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { checkPassword, hashPassword } from "@/lib/password";
import {
  getMobilePrincipal,
  hasOversizedBody,
  mobileJson,
  readJsonBody,
} from "@/lib/mobile-api";
import { MOBILE_CHANGE_PASSWORD_BODY } from "@/lib/mobile-contract";

export async function POST(request: Request) {
  if (hasOversizedBody(request, 4096)) return mobileJson({ error: "Requête trop volumineuse." }, 413);

  let principal: Awaited<ReturnType<typeof getMobilePrincipal>>;
  try {
    principal = await getMobilePrincipal(request);
  } catch (error) {
    console.error("Mobile change password authentication:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
  if (!principal) return mobileJson({ error: "Session mobile invalide ou expirée." }, 401);

  const body = await readJsonBody(request, 4096);
  if (body.tooLarge) return mobileJson({ error: "Requête trop volumineuse." }, 413);
  const parsed = MOBILE_CHANGE_PASSWORD_BODY.safeParse(body.value);
  if (!parsed.success) {
    return mobileJson(
      { error: parsed.error.issues[0]?.message ?? "Mot de passe invalide." },
      400,
    );
  }

  try {
    const db = requireDb();
    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, principal.userId))
      .limit(1);
    if (!user || !(await checkPassword(parsed.data.currentPassword, user.passwordHash))) {
      return mobileJson({ error: "Mot de passe actuel incorrect." }, 401);
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false })
      .where(eq(users.id, principal.userId));
    await db
      .update(candidates)
      .set({ tempPasswordEnc: null })
      .where(eq(candidates.userId, principal.userId));
    await audit({
      actorId: principal.userId,
      action: "compte.changer_mot_de_passe",
      table: "users",
      recordId: principal.userId,
    });

    return mobileJson({ changed: true });
  } catch (error) {
    console.error("Mobile change password:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
