import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { teacherDocuments } from "@/db/schema-gestion";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response(null, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const [document] = await requireDb().select({
    data: teacherDocuments.data, mime: teacherDocuments.mime, name: teacherDocuments.fileName,
  }).from(teacherDocuments).where(eq(teacherDocuments.id, id)).limit(1);
  if (!document) return new Response(null, { status: 404 });
  const safeName = document.name.replace(/["\\\r\n]/g, "_");
  return new Response(new Uint8Array(document.data), { headers: {
    "content-type": document.mime, "content-disposition": `attachment; filename="${safeName}"`,
    "cache-control": "private, no-store", "x-content-type-options": "nosniff",
  } });
}
