import "server-only";
import { asc, eq, and } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions, subjects } from "@/db/schema";
import { candidatePhotos, candidates, examCenters, exams, offices, rooms } from "@/db/schema-gestion";
import { formatDate, formatDay, formatTime } from "@/lib/bac-rules";
import { decrypt } from "@/lib/crypto";
import { A4, C, lambaBand, MARGIN, newDocument, qrPng, safe, siteUrl, text, wrap } from "./common";

const CONSIGNES = [
  "Présentez-vous au centre 30 minutes avant le début de chaque épreuve : aucun retard n'est accepté.",
  "Munissez-vous de cette convocation et d'une pièce d'identité à chaque épreuve.",
  "Le QR code est scanné à l'entrée, à chaque sortie et retour, et à la remise de la copie.",
  "Téléphones et documents non autorisés sont interdits en salle. Toute fraude est sanctionnée.",
  "Une absence vaut 0/20, et le 0 est éliminatoire sauf décision du jury.",
];

/** Convocation PDF d'un candidat, générée à la demande avec les données à jour (CAN-03). */
export async function convocationPdf(candidateId: string): Promise<Uint8Array | null> {
  const db = requireDb();
  const [row] = await db
    .select({
      c: candidates,
      session: examSessions,
      office: offices,
      center: examCenters,
      room: rooms,
    })
    .from(candidates)
    .innerJoin(examSessions, eq(examSessions.id, candidates.sessionId))
    .innerJoin(offices, eq(offices.id, candidates.officeId))
    .leftJoin(examCenters, eq(examCenters.id, candidates.centerId))
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .where(eq(candidates.id, candidateId))
    .limit(1);
  if (!row) return null;
  const { c, session, office, center, room } = row;

  const [photo] = await db
    .select()
    .from(candidatePhotos)
    .where(eq(candidatePhotos.candidateId, c.id))
    .limit(1);
  const timetable = await db
    .select({ startsAt: exams.startsAt, endsAt: exams.endsAt, subject: subjects.name })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(
      and(eq(exams.sessionId, c.sessionId), eq(exams.serieCode, c.serieCode), eq(exams.isPublished, true)),
    )
    .orderBy(asc(exams.startsAt));

  const { pdf, fonts, logo } = await newDocument(`Convocation ${c.matricule}`);
  const page = pdf.addPage([A4.width, A4.height]);
  const W = A4.width;
  let y = A4.height - MARGIN;

  // En-tête : logo à gauche, mentions officielles à droite (charte : à côté, jamais à la place).
  const logoH = 34;
  page.drawImage(logo, { x: MARGIN, y: y - logoH, width: (logo.width / logo.height) * logoH, height: logoH });
  const right = (s: string, yy: number, bold = false, size = 8.5) => {
    const f = bold ? fonts.bold : fonts.regular;
    page.drawText(safe(s), {
      x: W - MARGIN - f.widthOfTextAtSize(safe(s), size),
      y: yy,
      font: f,
      size,
      color: C.ink,
    });
  };
  right("REPOBLIKAN'I MADAGASIKARA", y - 8, true);
  right("Fitiavana - Tanindrazana - Fandrosoana", y - 19);
  right("Ministère de l'Enseignement supérieur", y - 30);
  right(office.name, y - 41, true);
  y -= 64;

  // Titre
  page.drawRectangle({ x: MARGIN, y: y - 50, width: W - 2 * MARGIN, height: 50, color: C.vert });
  text(page, "CONVOCATION", MARGIN + 18, y - 24, fonts.bold, 20, C.white);
  text(
    page,
    `Baccalauréat de l'enseignement général - Session ${session.year}`,
    MARGIN + 18,
    y - 40,
    fonts.regular,
    10,
    C.white,
  );
  const matSize = 15;
  const matW = fonts.monoBold.widthOfTextAtSize(c.matricule, matSize);
  page.drawRectangle({ x: W - MARGIN - matW - 30, y: y - 38, width: matW + 18, height: 26, color: C.white });
  page.drawText(c.matricule, {
    x: W - MARGIN - matW - 21,
    y: y - 30,
    font: fonts.monoBold,
    size: matSize,
    color: C.ink,
  });
  y -= 70;

  // Photo + identité + QR
  const photoW = 96;
  const photoH = 120;
  const top = y;
  if (photo) {
    const img = photo.mime === "image/png" ? await pdf.embedPng(photo.data) : await pdf.embedJpg(photo.data);
    page.drawImage(img, { x: MARGIN, y: top - photoH, width: photoW, height: photoH });
  } else {
    page.drawRectangle({ x: MARGIN, y: top - photoH, width: photoW, height: photoH, color: C.vertSoft });
    const initials = safe(`${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`).toUpperCase();
    page.drawText(initials, {
      x: MARGIN + photoW / 2 - fonts.bold.widthOfTextAtSize(initials, 30) / 2,
      y: top - photoH / 2 - 10,
      font: fonts.bold,
      size: 30,
      color: C.vert,
    });
  }
  page.drawRectangle({
    x: MARGIN,
    y: top - photoH,
    width: photoW,
    height: photoH,
    borderColor: C.line,
    borderWidth: 1,
  });

  const idX = MARGIN + photoW + 20;
  const qrSize = 132;
  const qrX = W - MARGIN - qrSize;
  const rows: [string, string][] = [
    ["Nom", c.lastName],
    ["Prénoms", c.firstName],
    ["Né(e) le", `${formatDate(c.birthDate)} à ${c.birthPlace}`],
    ["Série", c.serieCode],
    ["Candidat", c.kind === "ecole" ? `D'école - ${c.schoolName ?? ""}` : "Libre"],
  ];
  let iy = top - 10;
  for (const [label, value] of rows) {
    text(page, label.toUpperCase(), idX, iy, fonts.bold, 7.5, C.muted);
    iy = wrap(page, value, idX, iy - 12, qrX - idX - 16, fonts.bold, 11) - 6;
  }

  const qr = await qrPng(pdf, c.qrToken);
  page.drawImage(qr, { x: qrX, y: top - qrSize, width: qrSize, height: qrSize });
  const cap = "À présenter à chaque épreuve";
  text(
    page,
    cap,
    qrX + qrSize / 2 - fonts.regular.widthOfTextAtSize(safe(cap), 7.5) / 2,
    top - qrSize - 10,
    fonts.regular,
    7.5,
    C.muted,
  );
  y = Math.min(top - photoH, iy, top - qrSize - 14) - 18;

  // Centre d'examen et identifiants, côte à côte
  const boxW = (W - 2 * MARGIN - 14) / 2;
  const boxH = 92;
  page.drawRectangle({ x: MARGIN, y: y - boxH, width: boxW, height: boxH, color: C.soleilSoft });
  text(page, "CENTRE D'EXAMEN", MARGIN + 14, y - 18, fonts.bold, 8, C.muted);
  if (center && room) {
    wrap(page, center.name, MARGIN + 14, y - 34, boxW - 28, fonts.bold, 12);
    text(
      page,
      `${center.address ? `${center.address}, ` : ""}${center.city}`,
      MARGIN + 14,
      y - 52,
      fonts.regular,
      9.5,
      C.muted,
    );
    text(
      page,
      `${room.name}${c.seatNumber ? `  -  Place n° ${c.seatNumber}` : ""}`,
      MARGIN + 14,
      y - 72,
      fonts.bold,
      11,
    );
  } else {
    wrap(
      page,
      "Affectation en cours : consultez votre espace Mianara avant les épreuves.",
      MARGIN + 14,
      y - 36,
      boxW - 28,
      fonts.regular,
      10,
    );
  }

  const bx = MARGIN + boxW + 14;
  page.drawRectangle({ x: bx, y: y - boxH, width: boxW, height: boxH, color: C.vertSoft });
  text(page, "VOS IDENTIFIANTS MIANARA", bx + 14, y - 18, fonts.bold, 8, C.muted);
  text(page, "Identifiant", bx + 14, y - 36, fonts.regular, 9, C.muted);
  page.drawText(c.matricule, { x: bx + 90, y: y - 36, font: fonts.monoBold, size: 11, color: C.ink });
  text(page, "Mot de passe", bx + 14, y - 54, fonts.regular, 9, C.muted);
  const temp = c.tempPasswordEnc ? decrypt(c.tempPasswordEnc) : null;
  if (temp) page.drawText(temp, { x: bx + 90, y: y - 54, font: fonts.monoBold, size: 11, color: C.ink });
  else text(page, "déjà personnalisé par le candidat", bx + 90, y - 54, fonts.regular, 9, C.ink);
  text(page, `Connexion : ${siteUrl()}/connexion`, bx + 14, y - 72, fonts.regular, 8.5, C.vert);
  if (temp)
    text(
      page,
      "Mot de passe temporaire : à changer à la 1re connexion.",
      bx + 14,
      y - 84,
      fonts.regular,
      7.5,
      C.muted,
    );
  y -= boxH + 22;

  // Emploi du temps
  text(page, "EMPLOI DU TEMPS DES ÉPREUVES", MARGIN, y, fonts.bold, 9, C.muted);
  y -= 10;
  const col = [MARGIN, MARGIN + 190, MARGIN + 300];
  page.drawRectangle({ x: MARGIN, y: y - 18, width: W - 2 * MARGIN, height: 18, color: C.vert });
  ["Date", "Horaire", "Épreuve"].forEach((h, i) =>
    text(page, h, col[i] + 8, y - 12.5, fonts.bold, 8.5, C.white),
  );
  y -= 18;
  if (timetable.length === 0) {
    y -= 18;
    text(
      page,
      "L'emploi du temps officiel sera publié prochainement dans votre espace.",
      MARGIN + 8,
      y + 5,
      fonts.regular,
      9,
      C.muted,
    );
  }
  timetable.forEach((e, i) => {
    y -= 17;
    if (i % 2 === 0)
      page.drawRectangle({ x: MARGIN, y, width: W - 2 * MARGIN, height: 17, color: C.vertSoft });
    const day = formatDay(e.startsAt);
    text(page, day.charAt(0).toUpperCase() + day.slice(1), col[0] + 8, y + 5, fonts.regular, 9);
    text(page, `${formatTime(e.startsAt)} - ${formatTime(e.endsAt)}`, col[1] + 8, y + 5, fonts.regular, 9);
    text(page, e.subject, col[2] + 8, y + 5, fonts.bold, 9);
  });
  y -= 24;

  // Consignes
  text(page, "CONSIGNES", MARGIN, y, fonts.bold, 9, C.muted);
  y -= 14;
  for (const line of CONSIGNES) {
    page.drawCircle({ x: MARGIN + 3, y: y + 3, size: 1.8, color: C.mena });
    y = wrap(page, line, MARGIN + 12, y, W - 2 * MARGIN - 12, fonts.regular, 9) - 2;
  }

  // Pied
  const now = new Date().toLocaleString("fr-FR", {
    timeZone: "Indian/Antananarivo",
    dateStyle: "long",
    timeStyle: "short",
  });
  text(
    page,
    `Document généré le ${now}. Le QR code est signé électroniquement : toute copie modifiée est détectée.`,
    MARGIN,
    26,
    fonts.regular,
    7,
    C.muted,
  );
  lambaBand(page, 0, 12);

  return pdf.save();
}
