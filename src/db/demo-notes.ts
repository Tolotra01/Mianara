/**
 * Remplit les notes de la démonstration, sauf celles que le présentateur saisit
 * en direct : Malagasy pour la série L (4 candidats). Un candidat reste sans aucune
 * note ni scan pour illustrer la décision « Absent » (Onja RAZANAKOTO, candidate libre).
 *
 *   pnpm demo:notes
 */
import "dotenv/config";
import { and, eq, ne } from "drizzle-orm";
import { requireDb } from "./index";
import { examSessions, serieSubjects, subjects } from "./schema";
import { candidates, grades, users } from "./schema-gestion";

/** Niveau stable par candidat (même matricule → mêmes notes à chaque exécution). */
function level(matricule: string) {
  let h = 0;
  for (const ch of matricule) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// Profils choisis pour montrer toutes les mentions et un ajournement.
const PROFILE: Record<string, number> = {
  "BAC2027-L-00005": 15.5, // Toky : mention Très bien possible
  "BAC2027-L-00009": 12.5, // Voahirana : Assez bien
  "BAC2027-L-00004": 8, // Mialy : ajournée
  "BAC2027-S-00001": 14.5,
  "BAC2027-S-00002": 11,
  "BAC2027-OSE-00006": 10.5,
};

async function main() {
  const db = requireDb();
  const [session] = await db.select().from(examSessions).where(eq(examSessions.isCurrent, true)).limit(1);
  const [agent] = await db.select().from(users).where(eq(users.username, "office.tana")).limit(1);
  const people = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.sessionId, session.id), ne(candidates.matricule, "BAC2027-L-00012")));
  const coefs = await db
    .select({ serie: serieSubjects.serieCode, subjectId: serieSubjects.subjectId, code: subjects.code, name: subjects.name })
    .from(serieSubjects)
    .innerJoin(subjects, eq(subjects.id, serieSubjects.subjectId));

  let n = 0;
  await db.transaction(async (tx) => {
    for (const c of people) {
      const base = PROFILE[c.matricule] ?? 9.5 + (level(c.matricule) % 60) / 10;
      for (const s of coefs.filter((x) => x.serie === c.serieCode)) {
        // Saisie en direct pendant la démonstration.
        if (c.serieCode === "L" && s.name === "Malagasy") continue;
        const jitter = ((level(c.matricule + s.code) % 50) - 25) / 10;
        const score = Math.max(1, Math.min(19.5, Math.round((base + jitter) * 4) / 4));
        await tx
          .insert(grades)
          .values({ candidateId: c.id, subjectId: s.subjectId, score, enteredBy: agent.id, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: [grades.candidateId, grades.subjectId],
            set: { score, enteredBy: agent.id, updatedAt: new Date() },
          });
        n++;
      }
    }
  });
  console.log(`✓ ${n} notes enregistrées. À saisir en direct : Malagasy (série L).`);
  console.log("  Onja RAZANAKOTO (BAC2027-L-00012) reste sans note : elle sera « Absente » si elle n'est pas scannée.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
