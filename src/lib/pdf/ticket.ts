import "server-only";
import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { documentRequests, candidates, payments, offices } from "@/db/schema-gestion";
import { formatAriary, formatDateTime } from "@/lib/bac-rules";
import { DOC_LABEL, PAYMENT_METHOD, PAYMENT_STATUS, REQUEST_STATUS } from "@/lib/labels";
import { C, lambaBand, MARGIN, newDocument, qrPng, safe, text } from "./common";

/** Ticket de preuve de paiement (CAN-10) : numéro unique et QR. */
export async function ticketPdf(requestId: string) {
  const [row] = await requireDb()
    .select({ r: documentRequests, c: candidates, p: payments, office: offices.name })
    .from(documentRequests)
    .innerJoin(candidates, eq(candidates.id, documentRequests.candidateId))
    .innerJoin(offices, eq(offices.id, candidates.officeId))
    .innerJoin(payments, eq(payments.requestId, documentRequests.id))
    .where(eq(documentRequests.id, requestId));
  if (!row) return null;
  const { r, c, p } = row;

  const { pdf, fonts, logo } = await newDocument(`Ticket ${p.ticketNumber}`);
  const W = 420;
  const H = 540;
  const page = pdf.addPage([W, H]);
  let y = H - 36;
  page.drawImage(logo, { x: MARGIN - 12, y: y - 26, width: (logo.width / logo.height) * 26, height: 26 });
  const title = "TICKET DE PAIEMENT";
  text(page, title, W - 30 - fonts.bold.widthOfTextAtSize(title, 11), y - 16, fonts.bold, 11, C.vert);
  y -= 56;
  page.drawText(p.ticketNumber, { x: 30, y, font: fonts.monoBold, size: 18, color: C.ink });
  y -= 18;
  text(page, row.office, 30, y, fonts.regular, 9, C.muted);
  y -= 26;

  const lines: [string, string, boolean?][] = [
    ["Candidat", `${c.firstName} ${c.lastName}`],
    ["Matricule", c.matricule, true],
    ["Document", DOC_LABEL[r.type]],
    ["N° de demande", r.number, true],
    ["Montant", formatAriary(p.amount)],
    ["Paiement", PAYMENT_METHOD[p.method]],
    ["Référence", p.reference, true],
    ["Déposé le", formatDateTime(p.createdAt)],
    ["Paiement", PAYMENT_STATUS[p.status].label],
    ["Demande", REQUEST_STATUS[r.status].label],
  ];
  for (const [label, value, mono] of lines) {
    text(page, label, 30, y, fonts.regular, 9.5, C.muted);
    if (mono) page.drawText(safe(value), { x: 140, y, font: fonts.monoBold, size: 10, color: C.ink });
    else text(page, value, 140, y, fonts.bold, 10);
    y -= 19;
    page.drawLine({
      start: { x: 30, y: y + 12 },
      end: { x: W - 30, y: y + 12 },
      thickness: 0.5,
      color: C.line,
    });
  }
  const qr = await qrPng(pdf, `${p.ticketNumber}|${r.number}`);
  page.drawImage(qr, { x: W / 2 - 50, y: 44, width: 100, height: 100 });
  text(page, "Conservez ce ticket jusqu'au retrait du document.", 30, 30, fonts.regular, 8, C.muted);
  lambaBand(page, 0, 10);
  return pdf.save();
}
