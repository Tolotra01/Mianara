import { z } from "zod";
import { createDeviceSession } from "@/lib/auth";
import { ApiError, handler, json } from "@/lib/mobile-api";
import { authenticate } from "@/lib/services/login";

const Body = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  deviceName: z.string().trim().max(120).optional(),
});

/** Connexion depuis l'application : surveillants et agents de l'Office uniquement. */
export const POST = handler(async (request: Request) => {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    throw new ApiError(400, "INVALID", "Saisissez votre identifiant et votre mot de passe.");
  const result = await authenticate(parsed.data.username, parsed.data.password, "mobile");
  if ("error" in result) throw new ApiError(401, "INVALID_CREDENTIALS", result.error);
  const { user } = result;
  if (user.role !== "supervisor" && user.role !== "office") {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "L'application est réservée aux surveillants et aux agents de l'Office du Bac.",
    );
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const { token, expiresAt } = await createDeviceSession(user.id, {
    name: parsed.data.deviceName ?? null,
    ip,
  });
  return json({ token, expiresAt: expiresAt.toISOString(), mustChangePassword: user.mustChangePassword });
});
