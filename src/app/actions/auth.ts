"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { destroySession, getCurrentUser } from "@/lib/auth";

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit({ actorId: user.id, action: "deconnexion" });
  redirect("/connexion");
}
