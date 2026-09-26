"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { requireDb } from "@/db";
import { subjects } from "@/db/schema";
import { learningListings, teacherDocuments, teacherProfiles, users } from "@/db/schema-gestion";
import { audit } from "@/lib/audit";
import { createSession, getCurrentUser, hashPassword } from "@/lib/auth";
import { SERIES } from "@/lib/learning";
import { fail, ok, type ActionState, zodErrors } from "@/lib/action";
import { clientIp, mobileRateLimited } from "@/lib/mobile-api";
import { passwordProblem } from "@/lib/password";

const Register = z.object({
  fullName: z.string().trim().min(3).max(100),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{4,40}$/),
  subjectCode: z.string().trim().min(1).max(30),
  password: z.string().min(10).max(128).refine((value) => !passwordProblem(value)),
});

export async function registerTeacher(form: FormData): Promise<void> {
  const requestHeaders = await headers();
  if (mobileRateLimited(`teacher-register:${clientIp(new Request("http://localhost", { headers: requestHeaders }))}`, 5, 60 * 60_000))
    redirect("/enseignant/inscription?erreur=limite");
  const parsed = Register.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/enseignant/inscription?erreur=formulaire");
  const db = requireDb();
  const [subject] = await db.select({ code: subjects.code }).from(subjects)
    .where(eq(subjects.code, parsed.data.subjectCode)).limit(1);
  if (!subject) redirect("/enseignant/inscription?erreur=matiere");
  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        role: "teacher", username: parsed.data.username, fullName: parsed.data.fullName,
        passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false,
      }).returning({ id: users.id });
      await tx.insert(teacherProfiles).values({ userId: user.id, subjectCode: subject.code });
      await audit({ actorId: user.id, action: "enseignant.inscription", table: "users", recordId: user.id,
        newData: { role: "teacher", username: parsed.data.username, subjectCode: subject.code } }, tx);
      return user.id;
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505")
      redirect("/enseignant/inscription?erreur=identifiant");
    throw error;
  }
  await createSession(userId, "teacher");
  redirect("/enseignant");
}

const ListingInput = z.object({
  kind: z.enum(["course", "training", "coaching"]),
  series: z.array(z.enum(SERIES)).min(1).max(SERIES.length),
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(500),
  content: z.string().trim().min(10).max(20_000),
  priceAmount: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]),
  durationMinutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(6000)]),
});

export async function submitLearningListing(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return fail("Connexion enseignant requise.");
  const parsed = ListingInput.safeParse({
    kind: form.get("kind"), series: form.getAll("series"), title: form.get("title"),
    description: form.get("description"), content: form.get("content"),
    priceAmount: form.get("priceAmount"), durationMinutes: form.get("durationMinutes"),
  });
  if (!parsed.success) return fail("Vérifiez le formulaire.", zodErrors(parsed.error.issues));
  if (parsed.data.kind !== "coaching" && typeof parsed.data.priceAmount === "number" && parsed.data.priceAmount > 0)
    return fail("Seules les offres de coaching peuvent être payantes.");
  const [profile] = await requireDb().select().from(teacherProfiles)
    .where(eq(teacherProfiles.userId, user.id)).limit(1);
  if (!profile) return fail("Profil enseignant introuvable.");
  const data = parsed.data;
  const [listing] = await requireDb().insert(learningListings).values({
    teacherId: user.id, kind: data.kind, subjectCode: profile.subjectCode, series: data.series,
    title: data.title, description: data.description, content: data.content,
    priceAmount: data.priceAmount === "" ? null : data.priceAmount,
    durationMinutes: data.durationMinutes === "" ? null : data.durationMinutes,
  }).returning({ id: learningListings.id });
  await audit({ actorId: user.id, action: "apprentissage.proposition", table: "learning_listings",
    recordId: listing.id, newData: { kind: data.kind, subjectCode: profile.subjectCode, series: data.series } });
  return ok("Offre transmise à l'administration pour validation.");
}

const MAX_FILE_BYTES = 3 * 1024 * 1024;
function validSignature(mime: string, bytes: Buffer) {
  if (mime === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

export async function submitTeacherProof(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return fail("Connexion enseignant requise.");
  const kind = form.get("kind");
  if (kind !== "identity" && kind !== "qualification") return fail("Type de justificatif invalide.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_BYTES)
    return fail("Choisissez un fichier PDF, JPEG ou PNG de 3 Mo maximum.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validSignature(file.type, bytes)) return fail("Format ou contenu du fichier invalide.");
  const db = requireDb();
  await db.transaction(async (tx) => {
    await tx.insert(teacherDocuments).values({
      teacherId: user.id, kind, fileName: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "justificatif",
      mime: file.type, data: bytes, status: "pending", submittedAt: new Date(), reviewedAt: null,
    }).onConflictDoUpdate({
      target: [teacherDocuments.teacherId, teacherDocuments.kind],
      set: { fileName: file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 120) || "justificatif", mime: file.type, data: bytes, status: "pending", submittedAt: new Date(), reviewedAt: null },
    });
    await tx.update(teacherProfiles).set({ verificationStatus: "pending", reviewedAt: null })
      .where(eq(teacherProfiles.userId, user.id));
    await audit({ actorId: user.id, action: "enseignant.justificatif.soumis", table: "teacher_documents",
      newData: { kind, mime: file.type, size: bytes.length } }, tx);
  });
  return ok("Justificatif transmis pour examen.");
}
