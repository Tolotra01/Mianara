"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, HOME_BY_ROLE } from "@/lib/auth";
import { authenticate } from "@/lib/services/login";

export type LoginState = { message: string } | null;

const Login = z.object({
  identifiant: z.string().trim().min(1, "Saisissez votre matricule ou identifiant."),
  password: z.string().min(1, "Saisissez votre mot de passe."),
  suite: z.string().optional(),
});


export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = Login.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const { identifiant, password, suite } = parsed.data;

  const result = await authenticate(identifiant, password);
  if ("error" in result) return { message: result.error };
  const { user } = result;
  await createSession(user.id, user.role);

  const home = HOME_BY_ROLE[user.role];
  const safeSuite = suite && suite.startsWith(home) && !suite.startsWith("//") ? suite : home;
  redirect(user.mustChangePassword ? "/compte/mot-de-passe" : safeSuite);
}
