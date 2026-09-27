import { z } from "zod";
import { createDeviceSession } from "@/lib/auth";
import { accountPayload, LearnError, learnHandler, learnJson, readJson } from "@/lib/learn-api";
import { authenticate } from "@/lib/services/login";

const Body = z.object({
  identifiant: z.string().trim().min(1).optional(),
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1),
  deviceName: z.string().trim().max(120).optional(),
});

/** Connexion à l'application Mianara Mobile : candidats (matricule) et enseignants. */
export const POST = learnHandler(async (request: Request) => {
  const parsed = Body.safeParse(await readJson(request));
  const identifiant = parsed.success ? (parsed.data.identifiant ?? parsed.data.username) : null;
  if (!parsed.success || !identifiant)
    throw new LearnError(400, "INVALID", "Saisissez votre identifiant et votre mot de passe.");
  const result = await authenticate(identifiant, parsed.data.password, "mobile");
  if ("error" in result) {
    const locked = result.error.startsWith("Compte verrouillé");
    throw new LearnError(locked ? 423 : 401, locked ? "LOCKED" : "INVALID_CREDENTIALS", result.error);
  }
  const { user } = result;
  if (user.role !== "candidate" && user.role !== "teacher")
    throw new LearnError(
      403,
      "FORBIDDEN",
      "Cette application est réservée aux candidats et aux enseignants. Surveillants et agents : utilisez Mianara Contrôle.",
    );
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { token, expiresAt } = await createDeviceSession(user.id, {
    name: parsed.data.deviceName ?? "Mianara Mobile",
    ip,
  });
  return learnJson({
    token,
    expiresAt: expiresAt.toISOString(),
    mustChangePassword: user.mustChangePassword,
    ...(await accountPayload(user)),
  });
});
