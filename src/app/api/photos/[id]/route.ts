import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { candidatePhotos } from "@/db/schema-gestion";
import { canAccessCandidate } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";

/** Photo d'un candidat (stockage privé : servie seulement aux personnes autorisées). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !(await canAccessCandidate(user, id))) return new Response(null, { status: 403 });
  const [photo] = await requireDb()
    .select()
    .from(candidatePhotos)
    .where(eq(candidatePhotos.candidateId, id))
    .limit(1);
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "content-type": photo.mime, "cache-control": "private, max-age=300" },
  });
}
