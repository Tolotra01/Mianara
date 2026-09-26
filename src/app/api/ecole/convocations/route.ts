import { asc, eq } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { requireDb } from "@/db";
import { candidates } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";
import { convocationPdf } from "@/lib/pdf/convocation";

/** ECO-04 : toutes les convocations des candidats de l'école, dans un seul PDF (une page A5 chacune). */
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "school" || !user.schoolId) return new Response("Accès refusé", { status: 403 });
  const list = await requireDb()
    .select({ id: candidates.id })
    .from(candidates)
    .where(eq(candidates.schoolId, user.schoolId))
    .orderBy(asc(candidates.lastName), asc(candidates.firstName))
    .limit(500);
  if (!list.length) return new Response("Aucun candidat convoqué", { status: 404 });

  const merged = await PDFDocument.create();
  merged.setTitle(`Convocations — ${user.schoolName ?? "établissement"}`);
  for (const { id } of list) {
    const bytes = await convocationPdf(id);
    if (!bytes) continue;
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return new Response(Buffer.from(await merged.save()), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="convocations-${new Date().toISOString().slice(0, 10)}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
