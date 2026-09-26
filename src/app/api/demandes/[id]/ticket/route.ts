import { requestAccess } from "@/lib/request-access";
import { ticketPdf } from "@/lib/pdf/ticket";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requestAccess(id))) return new Response("Accès refusé", { status: 403 });
  const pdf = await ticketPdf(id);
  if (!pdf) return new Response("Introuvable", { status: 404 });
  return new Response(Buffer.from(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="ticket-${id.slice(0, 8)}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
