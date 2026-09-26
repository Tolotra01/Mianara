/**
 * Prépare une démonstration en direct : le premier jour d'épreuves est ramené à
 * aujourd'hui (début dans N minutes), tout le calendrier suit le même décalage.
 * Affiche ensuite la fiche de démonstration (comptes, candidats, salles).
 *
 *   pnpm demo:jour            (début dans 20 minutes)
 *   pnpm demo:jour -- 10      (début dans 10 minutes)
 *
 * Les entrées ouvrent 30 minutes avant le début : le scan est possible tout de suite.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireDb } from "./index";
import { examSessions, subjects } from "./schema";
import { candidates, exams, rooms, supervisorRooms, users } from "./schema-gestion";
import { decrypt } from "../lib/crypto";

const TZ = "Indian/Antananarivo";
const hm = (d: Date) => d.toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const day = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

/** Reçu Mobile Money fictif, à joindre à la demande de relevé pendant la démonstration. */
async function receipt(path: string) {
  if (existsSync(path)) return;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 420]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const lines: [string, string][] = [
    ["Opérateur", "MVola (démonstration)"],
    ["Référence", "MV-DEMO-2027-0001"],
    ["Montant", "10 000 Ar"],
    ["Bénéficiaire", "Office du Bac"],
    ["Objet", "Relevé de notes"],
  ];
  page.drawText("REÇU DE PAIEMENT", { x: 24, y: 370, size: 16, font: bold, color: rgb(0.05, 0.42, 0.31) });
  page.drawText("Document fictif pour la démonstration Mianara", { x: 24, y: 350, size: 8, font });
  lines.forEach(([k, v], i) => {
    page.drawText(k, { x: 24, y: 310 - i * 32, size: 9, font, color: rgb(0.3, 0.37, 0.34) });
    page.drawText(v, { x: 24, y: 296 - i * 32, size: 12, font: bold });
  });
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, await pdf.save());
}

async function main() {
  const minutes = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 20);
  const db = requireDb();
  const [session] = await db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1);
  if (!session) throw new Error("Aucune session en cours : lancez d'abord pnpm db:reset-demo.");

  const [{ first }] = await db
    .select({ first: sql<Date>`min(${exams.startsAt})` })
    .from(exams)
    .where(eq(exams.sessionId, session.id));
  if (!first) throw new Error("Aucune épreuve : lancez d'abord pnpm db:reset-demo.");

  // Début visé, arrondi aux 5 minutes supérieures.
  const target = new Date(Math.ceil((Date.now() + minutes * 60_000) / 300_000) * 300_000);
  const delta = target.getTime() - new Date(first).getTime();
  await db.execute(sql`
    update exams set starts_at = starts_at + ${`${delta} milliseconds`}::interval,
                     ends_at   = ends_at   + ${`${delta} milliseconds`}::interval
    where session_id = ${session.id}`);
  await db.execute(sql`
    update exam_sessions set
      exams_start = (select min((starts_at at time zone ${TZ})::date) from exams where session_id = ${session.id}),
      exams_end   = (select max((ends_at at time zone ${TZ})::date) from exams where session_id = ${session.id})
    where id = ${session.id}`);

  const firstExams = await db
    .select({ serie: exams.serieCode, subject: subjects.name, startsAt: exams.startsAt, endsAt: exams.endsAt })
    .from(exams)
    .innerJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(sql`${exams.sessionId} = ${session.id} and ${exams.startsAt} = ${target.toISOString()}`)
    .orderBy(asc(exams.serieCode));

  const people = await db
    .select({
      matricule: candidates.matricule,
      name: sql<string>`${candidates.firstName} || ' ' || ${candidates.lastName}`,
      serie: candidates.serieCode,
      kind: candidates.kind,
      room: rooms.name,
      seat: candidates.seatNumber,
      temp: candidates.tempPasswordEnc,
      supervisor: sql<string>`(select string_agg(${users.username}, ', ') from ${supervisorRooms}
        join ${users} on ${users.id} = ${supervisorRooms.supervisorId} where ${supervisorRooms.roomId} = ${rooms.id})`,
    })
    .from(candidates)
    .leftJoin(rooms, eq(rooms.id, candidates.roomId))
    .where(eq(candidates.sessionId, session.id))
    .orderBy(asc(candidates.matricule));

  const receiptPath = resolve(process.cwd(), "..", "demo", "recu-mvola-demo.pdf");
  await receipt(receiptPath);

  const password = process.env.DEMO_PASSWORD || "Mianara2027!";
  console.log(`\n✓ Jour de démonstration : ${day(target)}`);
  console.log(`  Premières épreuves : ${hm(target)} → entrées ouvertes dès maintenant (30 min avant), aucun retard après ${hm(target)}.\n`);
  for (const e of firstExams) console.log(`  Série ${e.serie.padEnd(4)} ${e.subject}  ${hm(e.startsAt)}–${hm(e.endsAt)}`);
  console.log(`\nPersonnel et écoles (mot de passe : ${password})`);
  console.log("  admin · office.tana · surveillant.tana1 · surveillant.tana2");
  console.log("  ecole.andohalo · ecole.rabearivelo · ecole.alarobia\n");
  console.log("Candidats (mot de passe temporaire, ou « déjà changé »)");
  for (const p of people) {
    const pw = p.temp ? (decrypt(p.temp) ?? "?") : "déjà changé";
    console.log(
      `  ${p.matricule.padEnd(18)} ${pw.padEnd(12)} ${p.name.padEnd(24)} ${(p.room ?? "sans salle").padEnd(10)} place ${String(p.seat ?? "-").padEnd(3)} ${p.supervisor ?? ""}${p.kind === "libre" ? "  (libre)" : ""}`,
    );
  }
  console.log(`\nReçu de paiement fictif : ${receiptPath}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
