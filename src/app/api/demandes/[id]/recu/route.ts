import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { payments } from "@/db/schema-gestion";
import { requestAccess } from "@/lib/request-access";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requestAccess(id))) return new Response("Accès refusé", { status: 403 });
  const [p] = await requireDb()
    .select({ mime: payments.receiptMime, data: payments.receipt })
    .from(payments)
    .where(eq(payments.requestId, id));
  if (!p) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(p.data), {
    headers: { "content-type": p.mime, "cache-control": "private, no-store" },
  });
}
