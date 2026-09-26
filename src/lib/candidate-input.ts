import { eq } from "drizzle-orm";
import { z } from "zod";
import { series } from "@/db/schema";
import type { Executor } from "./audit";

const text = (label: string, max = 80) => z.string().trim().min(1, `${label} obligatoire.`).max(max);
const optional = (max = 80) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

/** Identité d'un candidat, commune au formulaire de l'Office et aux dossiers des écoles. */
export const IdentityInput = z
  .object({
    lastName: text("Nom"),
    firstName: text("Prénoms"),
    gender: z.enum(["F", "M"], { error: "Choisissez le sexe." }),
    birthDate: z.iso.date("Date de naissance invalide."),
    birthPlace: text("Lieu de naissance"),
    address: text("Adresse", 160),
    serieCode: z.string({ error: "Choisissez la série." }).trim().min(1, "Choisissez la série.").max(8),
    cin: optional(20),
    phone: optional(20),
    email: z
      .union([z.literal(""), z.email("Email invalide.")])
      .optional()
      .transform((v) => v || null),
  })
  .superRefine((v, ctx) => {
    const age = (Date.now() - new Date(v.birthDate).getTime()) / (365.25 * 86400000);
    if (age < 12 || age > 80)
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: "Date de naissance improbable." });
  });

/** La série doit exister (Bacc général ou technique). */
export async function serieExists(code: string, exec: Executor) {
  const [row] = await exec.select({ code: series.code }).from(series).where(eq(series.code, code));
  return Boolean(row);
}

/** Séries proposées dans les formulaires, groupées par filière. */
export async function serieOptions(exec: Executor) {
  const rows = await exec
    .select({ code: series.code, name: series.name, track: series.track, sortOrder: series.sortOrder })
    .from(series);
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}
