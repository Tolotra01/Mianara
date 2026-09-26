"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireDb } from "@/db";
import { candidates, users } from "@/db/schema-gestion";
import { type ActionState, fail, ok, zodErrors } from "@/lib/action";
import { audit } from "@/lib/audit";
import { checkPassword, getCurrentUser, hashPassword, HOME_BY_ROLE } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { refresh } from "next/cache";

const ChangePassword = z
  .object({
    current: z.string().min(1, "Saisissez votre mot de passe actuel."),
    next: z.string(),
    confirm: z.string(),
  })
  .superRefine((v, ctx) => {
    const problem = passwordProblem(v.next);
    if (problem) ctx.addIssue({ code: "custom", path: ["next"], message: problem });
    if (v.next !== v.confirm)
      ctx.addIssue({ code: "custom", path: ["confirm"], message: "Les deux mots de passe diffèrent." });
    if (v.next === v.current)
      ctx.addIssue({
        code: "custom",
        path: ["next"],
        message: "Choisissez un mot de passe différent de l'actuel.",
      });
  });

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const parsed = ChangePassword.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));

  const db = requireDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!row || !(await checkPassword(parsed.data.current, row.hash))) {
    return fail("Mot de passe actuel incorrect.", { current: "Mot de passe actuel incorrect." });
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false })
    .where(eq(users.id, user.id));
  // Le mot de passe temporaire n'a plus lieu d'être imprimé sur la convocation.
  if (user.role === "candidate")
    await db.update(candidates).set({ tempPasswordEnc: null }).where(eq(candidates.userId, user.id));
  await audit({ actorId: user.id, action: "compte.changer_mot_de_passe", table: "users", recordId: user.id });

  if (user.mustChangePassword)
    redirect(`${HOME_BY_ROLE[user.role]}?ok=${encodeURIComponent("Mot de passe enregistré. Bienvenue !")}`);
  return ok("Mot de passe modifié.");
}

const Contact = z.object({
  email: z.union([z.literal(""), z.email("Adresse email invalide.")]),
  phone: z.string().trim().max(20),
});

/** Coordonnées modifiables par l'utilisateur (nom, naissance et série ne le sont pas : CAN-13). */
export async function updateContact(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  const parsed = Contact.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  const data = { email: parsed.data.email || null, phone: parsed.data.phone || null };
  const db = requireDb();
  await db.update(users).set(data).where(eq(users.id, user.id));
  if (user.role === "candidate") await db.update(candidates).set(data).where(eq(candidates.userId, user.id));
  await audit({
    actorId: user.id,
    action: "compte.modifier_coordonnees",
    table: "users",
    recordId: user.id,
    oldData: { email: user.email, phone: user.phone },
    newData: data,
  });
  refresh();
  return ok("Coordonnées enregistrées.");
}
