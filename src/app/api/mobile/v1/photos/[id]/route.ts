import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidatePhotos, candidates } from "@/db/schema-gestion";
import { ApiError, handler, mobileUser } from "@/lib/mobile-api";

/** Photo d'un candidat de l'Office, téléchargée pour la comparaison hors ligne. */
export const GET = handler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await mobileUser(request);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(404, "NOT_FOUND", "Photo introuvable.");
  const [row] = await requireDb()
    .select({ mime: candidatePhotos.mime, data: candidatePhotos.data, officeId: candidates.officeId })
    .from(candidatePhotos)
    .innerJoin(candidates, eq(candidates.id, candidatePhotos.candidateId))
    .where(eq(candidatePhotos.candidateId, id));
  if (!row || row.officeId !== user.officeId) throw new ApiError(404, "NOT_FOUND", "Photo introuvable.");
  return new Response(new Uint8Array(row.data), {
    headers: { "content-type": row.mime, "cache-control": "private, max-age=86400" },
  });
});
