"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireDb } from "@/db";
import { offices } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { OFFICE_VISIT_COOKIE, requireUser } from "@/lib/auth";

/** L'Admin entre dans l'espace d'un Office, en consultation (aucune modification possible). */
export async function startOfficeVisit(form: FormData) {
  const user = await requireUser(["admin"]);
  const id = Number(form.get("officeId"));
  const [office] = await requireDb().select({ id: offices.id }).from(offices).where(eq(offices.id, id));
  if (!office) redirect("/admin/offices");
  (await cookies()).set(OFFICE_VISIT_COOKIE, String(id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 3600,
  });
  await audit({ actorId: user.id, action: "office.visiter", table: "offices", recordId: id });
  redirect("/office");
}

export async function endOfficeVisit() {
  await requireUser(["admin"]);
  (await cookies()).delete(OFFICE_VISIT_COOKIE);
  redirect("/admin/offices");
}
