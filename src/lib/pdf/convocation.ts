import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions, series, subjects } from "@/db/schema";
import { candidatePhotos, candidates, examCenters, exams, offices, rooms } from "@/db/schema-gestion";
import { formatDate, formatDay, formatTime } from "@/lib/bac-rules";
import { decrypt } from "@/lib/crypto";
import { qrText, schoolYear } from "@/lib/qr-content";
import { C, lambaBand, newDocument, qrPng, safe, siteUrl, text, wrap } from "./common";

/** Format A5 portrait (148 × 210 mm) : la convocation tient dans une main ou une poche. */
const A5 = { width: 419.53, height: 595.28 };
const M = 24;

const CONSIGNES = [
  "Présentez-vous 30 minutes avant chaque épreuve : aucun retard n'est accepté.",
  "Apportez cette convocation et une pièce d'identité à chaque épreuve.",
  "Le QR code est scanné à l'entrée, aux sorties et retours, et à la remise de la copie.",
  "Téléphone interdit en salle. Une absence vaut 0/20, éliminatoire sauf décision du jury.",
];

async function loadConvocation(candidateId: string) {
  const [row] = await requireDb()
    .select({
      c: candidates,
      session: examSessions,
      office: offices,
      serie: series,
      center: examCenters,
      room: rooms,
    })
    .from(candidates)
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .innerJoin(offices, eq(offices.id, candidates.officeId))
    .innerJoin(series, eq(series.code, candidates.serieCode))
    .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .where(eq(candidates.id, candidateId))
    .limit(1);
  return row ?? null;
}

/** Texte du QR (lisible par tout lecteur, jeton signé en dernière ligne). */
export async function candidateQrText(candidateId: string) {
  const row = await loadConvocation(candidateId);
  if (!row) return null;
  const { c, session, serie } = row;
  return qrText({ ...c, serieName: serie.name, sessionYear: session.year });
}

/** Convocation PDF d'un candidat, générée à la demande avec les données à jour (CAN-03). */
export async function convocationPdf(candidateId: string): Promise<Uint8Array | null> {
  const row = await loadConvocation(candidateId);
  if (!row) return null;
  const { c, session, office, serie, center, room } = row;
  const db = requireDb();
  const [[photo], timetable] = await Promise.all([
    db.select().from(candidatePhotos).where(eq(candidatePhotos.candidateId, c.id)).limit(1),
    db
      .select({ startsAt: exams.startsAt, endsAt: exams.endsAt, subject: subjects.name })
      .from(exams)
      .innerJoin(subjects, eq(subjects.id, exams.subjectId))
      .where(
        and(eq(exams.sessionId, c.sessionId), eq(exams.serieCode, c.serieCode), eq(exams.isPublished, true)),
      )
      .orderBy(asc(exams.startsAt)),
  ]);

  const { pdf, fonts, logo } = await newDocument(`Convocation ${c.matricule}`);
  const page = pdf.addPage([A5.width, A5.height]);
  const W = A5.width;
  let y = A5.height - M;

  // En-tête : logo à gauche, mentions officielles à droite.
  const logoH = 22;
  page.drawImage(logo, { x: M, y: y - logoH, width: (logo.width / logo.height) * logoH, height: logoH });
  const right = (s: string, yy: number, bold = false) => {
    const f = bold ? fonts.bold : fonts.regular;
    page.drawText(safe(s), {
      x: W - M - f.widthOfTextAtSize(safe(s), 6.5),
      y: yy,
      font: f,
      size: 6.5,
      color: C.ink,
    });
  };
  right("REPOBLIKAN'I MADAGASIKARA", y - 5, true);
  right("Fitiavana - Tanindrazana - Fandrosoana", y - 13);
  right(office.name, y - 21, true);
  y -= 34;

  // Bandeau titre
  const technique = serie.track === "technique";
  page.drawRectangle({ x: M, y: y - 34, width: W - 2 * M, height: 34, color: C.vert });
  text(page, "CONVOCATION", M + 10, y - 16, fonts.bold, 13, C.white);
  text(
    page,
    `Bac ${technique ? "technique" : "de l'enseignement général"} · Session ${session.year} (${schoolYear(session.year)})`,
    M + 10,
    y - 27,
    fonts.regular,
    7,
    C.white,
  );
  const matW = fonts.monoBold.widthOfTextAtSize(c.matricule, 9.5);
  page.drawRectangle({ x: W - M - matW - 18, y: y - 25, width: matW + 12, height: 16, color: C.white });
  page.drawText(c.matricule, {
    x: W - M - matW - 12,
    y: y - 20.5,
    font: fonts.monoBold,
    size: 9.5,
    color: C.ink,
  });
  y -= 44;

  // Photo, identité, QR
  const photoW = 58;
  const photoH = 72;
  const top = y;
  if (photo) {
    const img = photo.mime === "image/png" ? await pdf.embedPng(photo.data) : await pdf.embedJpg(photo.data);
    page.drawImage(img, { x: M, y: top - photoH, width: photoW, height: photoH });
  } else {
    page.drawRectangle({ x: M, y: top - photoH, width: photoW, height: photoH, color: C.vertSoft });
    const initials = safe(`${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`).toUpperCase();
    page.drawText(initials, {
      x: M + photoW / 2 - fonts.bold.widthOfTextAtSize(initials, 18) / 2,
      y: top - photoH / 2 - 6,
      font: fonts.bold,
      size: 18,
      color: C.vert,
    });
  }
  page.drawRectangle({
    x: M,
    y: top - photoH,
    width: photoW,
    height: photoH,
    borderColor: C.line,
    borderWidth: 0.8,
  });

  const qrSize = 116;
  const qrX = W - M - qrSize + 4; // la marge blanche du QR (4 modules) sert d'espace
  const idX = M + photoW + 10;
  const idW = qrX - idX - 4;
  const rows: [string, string][] = [
    ["Nom et prénoms", `${c.lastName} ${c.firstName}`],
    ["Né(e) le", `${formatDate(c.birthDate)} à ${c.birthPlace}`],
    ["Adresse", c.address || "-"],
    ["Établissement", c.kind === "ecole" ? (c.schoolName ?? "-") : "Candidat libre"],
    ["Série", `${c.serieCode} · ${serie.name}`],
  ];
  let iy = top - 6;
  for (const [label, value] of rows) {
    text(page, label.toUpperCase(), idX, iy, fonts.bold, 5.5, C.muted);
    iy = wrap(page, value, idX, iy - 8.5, idW, fonts.bold, 7.5, C.ink, 1.25) - 3;
  }
  const qr = await qrPng(pdf, qrText({ ...c, serieName: serie.name, sessionYear: session.year }));
  page.drawImage(qr, { x: qrX, y: top - qrSize + 6, width: qrSize, height: qrSize });
  y = Math.min(top - photoH, iy, top - qrSize + 6) - 10;

  // Centre et identifiants
  const boxW = (W - 2 * M - 8) / 2;
  const boxH = 54;
  page.drawRectangle({ x: M, y: y - boxH, width: boxW, height: boxH, color: C.soleilSoft });
  text(page, "CENTRE D'EXAMEN", M + 8, y - 11, fonts.bold, 5.5, C.muted);
  if (center && room) {
    wrap(page, center.name, M + 8, y - 22, boxW - 16, fonts.bold, 8);
    text(
      page,
      `${center.address ? `${center.address}, ` : ""}${center.city}`,
      M + 8,
      y - 33,
      fonts.regular,
      6.5,
      C.muted,
    );
    text(
      page,
      `${room.name}${c.seatNumber ? `  ·  Place n° ${c.seatNumber}` : ""}`,
      M + 8,
      y - 46,
      fonts.bold,
      8,
    );
  } else {
    wrap(
      page,
      "Affectation en cours : consultez votre espace Mianara.",
      M + 8,
      y - 23,
      boxW - 16,
      fonts.regular,
      7,
    );
  }
  const bx = M + boxW + 8;
  page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, color: C.vertSoft });
  text(page, "IDENTIFIANTS MIANARA", bx + 8, y - 11, fonts.bold, 5.5, C.muted);
  text(page, "Identifiant", bx + 8, y - 23, fonts.regular, 6.5, C.muted);
  page.drawText(c.matricule, { x: bx + 56, y: y - 23, font: fonts.monoBold, size: 7.5, color: C.ink });
  text(page, "Mot de passe", bx + 8, y - 34, fonts.regular, 6.5, C.muted);
  const temp = c.tempPasswordEnc ? decrypt(c.tempPasswordEnc) : null;
  if (temp) page.drawText(temp, { x: bx + 56, y: y - 34, font: fonts.monoBold, size: 7.5, color: C.ink });
  else text(page, "personnalisé", bx + 56, y - 34, fonts.regular, 6.5);
  text(
    page,
    `${siteUrl().replace(/^https?:\/\//, "")}/connexion`,
    bx + 8,
    y - 46,
    fonts.regular,
    6.5,
    C.vert,
  );
  y -= boxH + 12;

  // Emploi du temps
  text(page, "EMPLOI DU TEMPS", M, y, fonts.bold, 6.5, C.muted);
  y -= 6;
  const col = [M, M + 128, M + 196];
  page.drawRectangle({ x: M, y: y - 12, width: W - 2 * M, height: 12, color: C.vert });
  ["Date", "Horaire", "Épreuve"].forEach((h, i) =>
    text(page, h, col[i] + 5, y - 8.5, fonts.bold, 6.5, C.white),
  );
  y -= 12;
  if (timetable.length === 0) {
    y -= 12;
    text(
      page,
      "Emploi du temps publié prochainement dans votre espace.",
      M + 5,
      y + 4,
      fonts.regular,
      6.5,
      C.muted,
    );
  }
  timetable.forEach((e, i) => {
    y -= 11;
    if (i % 2 === 0) page.drawRectangle({ x: M, y, width: W - 2 * M, height: 11, color: C.vertSoft });
    const day = formatDay(e.startsAt);
    text(page, day.charAt(0).toUpperCase() + day.slice(1), col[0] + 5, y + 3.5, fonts.regular, 6.5);
    text(
      page,
      `${formatTime(e.startsAt)} - ${formatTime(e.endsAt)}`,
      col[1] + 5,
      y + 3.5,
      fonts.regular,
      6.5,
    );
    text(page, e.subject, col[2] + 5, y + 3.5, fonts.bold, 6.5);
  });
  y -= 14;

  // Consignes
  text(page, "CONSIGNES", M, y, fonts.bold, 6.5, C.muted);
  y -= 9;
  for (const line of CONSIGNES) {
    page.drawCircle({ x: M + 2, y: y + 2, size: 1.2, color: C.mena });
    y = wrap(page, line, M + 7, y, W - 2 * M - 7, fonts.regular, 6.3, C.ink, 1.3) - 1;
  }

  const now = new Date().toLocaleString("fr-FR", {
    timeZone: "Indian/Antananarivo",
    dateStyle: "short",
    timeStyle: "short",
  });
  text(
    page,
    `Générée le ${now} · QR signé électroniquement : toute copie modifiée est détectée.`,
    M,
    16,
    fonts.regular,
    5.5,
    C.muted,
  );
  lambaBand(page, 0, 8);
  return pdf.save();
}
