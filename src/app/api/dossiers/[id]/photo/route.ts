import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { applications, schools } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";

/** Photo d'un dossier d'école : l'école, son Office et l'Admin. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 403 });
  const [row] = await requireDb()
    .select({
      mime: applications.photoMime,
      data: applications.photo,
      schoolId: applications.schoolId,
      officeId: schools.officeId,
    })
    .from(applications)
    .innerJoin(schools, eq(schools.id, applications.schoolId))
    .where(eq(applications.id, id));
  const allowed =
    row &&
    (user.role === "admin" ||
      (user.role === "school" && user.schoolId === row.schoolId) ||
      (user.role === "office" && user.officeId === row.officeId));
  if (!allowed) return new Response(null, { status: 403 });
  if (!row.data || !row.mime) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: { "content-type": row.mime, "cache-control": "private, max-age=120" },
  });
}
