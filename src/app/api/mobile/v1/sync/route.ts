import { z } from "zod";
import { ApiError, handler, json, mobileUser } from "@/lib/mobile-api";
import { buildPackage, ingestScans } from "@/lib/services/mobile-sync";

/** Paquet hors ligne : salles, épreuves, candidats, scans déjà enregistrés. */
export const GET = handler(async (request: Request) => {
  const user = await mobileUser(request);
  return json(await buildPackage(user));
});

const Body = z.object({
  deviceId: z.string().trim().max(80).optional(),
  deviceNow: z.iso.datetime({ offset: true }),
  scans: z
    .array(
      z.object({
        id: z.uuid(),
        candidateId: z.uuid(),
        examId: z.number().int().positive(),
        type: z.enum(["entry", "exit", "return", "end", "fraud"]),
        scannedAt: z.iso.datetime({ offset: true }),
        comment: z.string().max(500).nullish(),
      }),
    )
    .max(500),
});

/** File d'attente du téléphone : chaque scan est accepté, déjà connu ou refusé (avec la raison). */
export const POST = handler(async (request: Request) => {
  const user = await mobileUser(request);
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, "INVALID", "Données de synchronisation invalides.");
  const result = await ingestScans(
    user,
    parsed.data.scans,
    new Date(parsed.data.deviceNow),
    parsed.data.deviceId ?? null,
  );
  return json({ ...result, serverTime: new Date().toISOString() });
});
