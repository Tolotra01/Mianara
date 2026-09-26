/**
 * Jeu de démonstration de la gestion du Bac : Offices, comptes, centres et
 * salles, emploi du temps 2027 et quelques candidats enregistrés par l'Office
 * d'Antananarivo (avec leur convocation).
 *
 *   pnpm db:seed:demo
 *
 * Mot de passe des comptes du personnel : DEMO_PASSWORD (par défaut Mianara2027!).
 */
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { requireDb } from "./index";
import { examSessions, serieSubjects, subjects } from "./schema";
import { examCenters, exams, offices, rooms, supervisorRooms, users } from "./schema-gestion";
import { hashPassword } from "../lib/password";
import { parseLocalDateTime } from "../lib/bac-rules";
import { assignRooms, registerCandidate } from "../lib/services/candidates";

const PASSWORD = process.env.DEMO_PASSWORD || "Mianara2027!";

const OFFICES = [
  { city: "Antananarivo", university: "Université d'Antananarivo" },
  { city: "Fianarantsoa", university: "Université de Fianarantsoa" },
  { city: "Toamasina", university: "Université de Toamasina" },
  { city: "Mahajanga", university: "Université de Mahajanga" },
  { city: "Antsiranana", university: "Université d'Antsiranana" },
  { city: "Toliara", university: "Université de Toliara" },
];

const CANDIDATES = [
  ["RAKOTOARISOA", "Fanja", "F", "S", "2008-03-14", "Antananarivo", "Lycée Jean-Joseph Rabearivelo"],
  ["RANDRIANASOLO", "Aina", "F", "S", "2008-07-02", "Antananarivo", "Lycée Jean-Joseph Rabearivelo"],
  ["RASOAMANANA", "Hery", "M", "S", "2007-11-21", "Antsirabe", "Lycée Andohalo"],
  ["RAZAFINDRAKOTO", "Mialy", "F", "L", "2008-01-09", "Antananarivo", "Lycée Andohalo"],
  ["ANDRIAMAMPIANINA", "Toky", "M", "L", "2008-05-30", "Ambatolampy", "Lycée Jean-Joseph Rabearivelo"],
  ["RAHARISON", "Nomena", "F", "OSE", "2008-09-17", "Antananarivo", "Lycée Andohalo"],
  ["RAVELOSON", "Tiana", "M", "OSE", "2007-12-03", "Moramanga", "Lycée Jean-Joseph Rabearivelo"],
  ["RANDRIAMIHAJA", "Sitraka", "M", "S", "2008-02-25", "Antananarivo", null],
  ["RAMANANTSOA", "Voahirana", "F", "L", "2008-04-11", "Arivonimamo", "Lycée Andohalo"],
  ["RABEMANANJARA", "Lova", "M", "OSE", "2008-06-06", "Antananarivo", "Lycée Jean-Joseph Rabearivelo"],
  ["RAKOTONIRINA", "Tahina", "M", "S", "2008-10-28", "Ambohidratrimo", "Lycée Andohalo"],
  ["RAZANAKOTO", "Onja", "F", "L", "2008-08-19", "Antananarivo", null],
] as const;

/** Emploi du temps indicatif : deux épreuves par jour, du lundi 16 au vendredi 20 août 2027. */
const SLOTS = [
  ["2027-08-16T07:30", "2027-08-16T11:30"],
  ["2027-08-16T14:00", "2027-08-16T17:00"],
  ["2027-08-17T07:30", "2027-08-17T11:30"],
  ["2027-08-17T14:00", "2027-08-17T17:00"],
  ["2027-08-18T07:30", "2027-08-18T11:30"],
  ["2027-08-18T14:00", "2027-08-18T17:00"],
  ["2027-08-19T07:30", "2027-08-19T11:30"],
  ["2027-08-19T14:00", "2027-08-19T17:00"],
  ["2027-08-20T07:30", "2027-08-20T10:30"],
] as const;

async function main() {
  const db = requireDb();
  const [existing] = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  if (existing) {
    console.log("Le jeu de démonstration est déjà chargé (compte « admin » présent).");
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    const [session] = await tx
      .update(examSessions)
      .set({ examsStart: "2027-08-16", examsEnd: "2027-08-20" })
      .where(eq(examSessions.year, 2027))
      .returning();
    if (!session) throw new Error("Session 2027 absente : lancez d'abord pnpm db:seed.");

    const officeRows = await tx
      .insert(offices)
      .values(
        OFFICES.map((o) => ({
          ...o,
          name: `Office du Bac de ${o.city}`,
          address: `${o.university}, ${o.city}`,
        })),
      )
      .returning();
    const tana = officeRows[0];
    const hash = await hashPassword(PASSWORD);

    const staff = await tx
      .insert(users)
      .values([
        {
          role: "admin",
          username: "admin",
          passwordHash: hash,
          fullName: "Administration nationale",
          mustChangePassword: false,
        },
        {
          role: "office",
          username: "office.tana",
          passwordHash: hash,
          fullName: "Hanitra Rakotomalala",
          officeId: tana.id,
          mustChangePassword: false,
        },
        {
          role: "supervisor",
          username: "surveillant.tana1",
          passwordHash: hash,
          fullName: "Jean Randrianarivelo",
          officeId: tana.id,
          mustChangePassword: false,
        },
        {
          role: "supervisor",
          username: "surveillant.tana2",
          passwordHash: hash,
          fullName: "Sahondra Rabe",
          officeId: tana.id,
          mustChangePassword: false,
        },
      ])
      .returning();
    const agent = staff[1];

    const [c1, c2] = await tx
      .insert(examCenters)
      .values([
        {
          officeId: tana.id,
          name: "Lycée Jean-Joseph Rabearivelo",
          city: "Antananarivo",
          address: "Analakely",
        },
        { officeId: tana.id, name: "Lycée Andohalo", city: "Antananarivo", address: "Andohalo" },
      ])
      .returning();
    const roomRows = await tx
      .insert(rooms)
      .values([
        { centerId: c1.id, name: "Salle 1", capacity: 5 },
        { centerId: c1.id, name: "Salle 2", capacity: 5 },
        { centerId: c2.id, name: "Salle A", capacity: 10 },
      ])
      .returning();
    await tx.insert(supervisorRooms).values([
      { supervisorId: staff[2].id, roomId: roomRows[0].id },
      { supervisorId: staff[2].id, roomId: roomRows[1].id },
      { supervisorId: staff[3].id, roomId: roomRows[2].id },
    ]);

    // Emploi du temps publié : les matières de chaque série, hors « autres disciplines ».
    const subjectRows = await tx
      .select()
      .from(subjects)
      .where(inArray(subjects.code, ["AUT"]));
    const autId = subjectRows[0]?.id;
    for (const serie of ["L", "S", "OSE"]) {
      const list = await tx
        .select({ subjectId: serieSubjects.subjectId, coefficient: serieSubjects.coefficient })
        .from(serieSubjects)
        .where(eq(serieSubjects.serieCode, serie));
      const ordered = list.filter((s) => s.subjectId !== autId).sort((a, b) => b.coefficient - a.coefficient);
      await tx.insert(exams).values(
        ordered.slice(0, SLOTS.length).map((s, i) => ({
          sessionId: session.id,
          serieCode: serie,
          subjectId: s.subjectId,
          startsAt: parseLocalDateTime(SLOTS[i][0])!,
          endsAt: parseLocalDateTime(SLOTS[i][1])!,
          isPublished: true,
        })),
      );
    }

    const created: { matricule: string; password: string; name: string }[] = [];
    for (const [lastName, firstName, gender, serieCode, birthDate, birthPlace, school] of CANDIDATES) {
      const { candidate, password } = await registerCandidate(
        {
          officeId: tana.id,
          lastName,
          firstName,
          gender,
          serieCode,
          birthDate,
          birthPlace,
          kind: school ? "ecole" : "libre",
          schoolName: school,
        },
        agent.id,
        tx,
      );
      created.push({ matricule: candidate.matricule, password, name: `${firstName} ${lastName}` });
    }
    await assignRooms(tana.id, agent.id, tx);

    console.log("\n✓ Jeu de démonstration chargé.\n");
    console.log(`Personnel (mot de passe : ${PASSWORD})`);
    console.log("  admin               Administration nationale");
    console.log("  office.tana         Office du Bac d'Antananarivo");
    console.log("  surveillant.tana1   Surveillant (Salles 1 et 2)");
    console.log("  surveillant.tana2   Surveillant (Salle A)\n");
    console.log("Candidats (mot de passe temporaire, à changer à la 1re connexion)");
    for (const c of created.slice(0, 4)) console.log(`  ${c.matricule}   ${c.password}   ${c.name}`);
    console.log("  … les autres identifiants figurent sur leur convocation (espace Office).\n");
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
