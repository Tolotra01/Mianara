/**
 * Jeu de démonstration de la gestion du Bac : Offices, écoles et leurs comptes,
 * centres et salles, emploi du temps 2027 (EPS théorique comprise), candidats du
 * Bac général et technique, dossiers d'écoles à traiter, actualité proposée.
 *
 *   pnpm db:seed:demo      (ou pnpm db:reset-demo pour repartir de zéro)
 *
 * Mot de passe des comptes du personnel : DEMO_PASSWORD (par défaut Mianara2027!).
 */
import "dotenv/config";
import { eq, ne } from "drizzle-orm";
import { requireDb } from "./index";
import { examSessions, news, serieSubjects, subjects } from "./schema";
import {
  applicationBatches,
  applications,
  examCenters,
  exams,
  offices,
  rooms,
  schools,
  supervisorRooms,
  users,
} from "./schema-gestion";
import { hashPassword } from "../lib/password";
import { PIECES } from "../lib/pieces";
import { parseLocalDateTime } from "../lib/bac-rules";
import { assignRooms, registerCandidate } from "../lib/services/candidates";
import { seedLearning } from "./seed-learning";

const PASSWORD = process.env.DEMO_PASSWORD || "Mianara2027!";

const OFFICES = [
  { city: "Antananarivo", university: "Université d'Antananarivo" },
  { city: "Fianarantsoa", university: "Université de Fianarantsoa" },
  { city: "Toamasina", university: "Université de Toamasina" },
  { city: "Mahajanga", university: "Université de Mahajanga" },
  { city: "Antsiranana", university: "Université d'Antsiranana" },
  { city: "Toliara", university: "Université de Toliara" },
];

const SCHOOLS = [
  {
    key: "ljjr",
    code: "TNR-LJJR",
    name: "Lycée Jean-Joseph Rabearivelo",
    kind: "public",
    commune: "Antananarivo Renivohitra",
    address: "Analakely",
    contactName: "Mme Rasoanirina",
    phone: "020 22 000 01",
    account: ["ecole.rabearivelo", "Secrétariat du Lycée J.-J. Rabearivelo"],
  },
  {
    key: "land",
    code: "TNR-LAND",
    name: "Lycée Andohalo",
    kind: "public",
    commune: "Antananarivo Renivohitra",
    address: "Andohalo",
    contactName: "M. Rakotondrabe",
    phone: "020 22 000 02",
    account: ["ecole.andohalo", "Direction du Lycée Andohalo"],
  },
  {
    key: "ltpa",
    code: "TNR-LTPA",
    name: "Lycée technique professionnel d'Alarobia",
    kind: "public",
    commune: "Antananarivo Avaradrano",
    address: "Alarobia",
    contactName: "M. Randrianjafy",
    phone: "020 22 000 03",
    account: ["ecole.alarobia", "Secrétariat du LTP d'Alarobia"],
  },
] as const;

/** [nom, prénom, sexe, série, naissance, lieu, adresse, école (null = candidat libre)] */
const CANDIDATES = [
  [
    "RAKOTOARISOA",
    "Fanja",
    "F",
    "S",
    "2008-03-14",
    "Antananarivo",
    "Lot II A 45 Analakely, Antananarivo",
    "ljjr",
  ],
  ["RANDRIANASOLO", "Aina", "F", "S", "2008-07-02", "Antananarivo", "Lot IVG 8 Isotry, Antananarivo", "ljjr"],
  ["RASOAMANANA", "Hery", "M", "S", "2007-11-21", "Antsirabe", "Lot 12 Ambohijatovo, Antananarivo", "land"],
  [
    "RAZAFINDRAKOTO",
    "Mialy",
    "F",
    "L",
    "2008-01-09",
    "Antananarivo",
    "Lot IVG 12 Andohalo, Antananarivo",
    "land",
  ],
  [
    "ANDRIAMAMPIANINA",
    "Toky",
    "M",
    "L",
    "2008-05-30",
    "Ambatolampy",
    "Lot 3 Ankadifotsy, Antananarivo",
    "ljjr",
  ],
  [
    "RAHARISON",
    "Nomena",
    "F",
    "OSE",
    "2008-09-17",
    "Antananarivo",
    "Lot 27 Faravohitra, Antananarivo",
    "land",
  ],
  ["RAVELOSON", "Tiana", "M", "OSE", "2007-12-03", "Moramanga", "Lot 9 Mahamasina, Antananarivo", "ljjr"],
  ["RANDRIAMIHAJA", "Sitraka", "M", "S", "2008-02-25", "Antananarivo", "Lot 4 Ambohipo, Antananarivo", null],
  [
    "RAMANANTSOA",
    "Voahirana",
    "F",
    "L",
    "2008-04-11",
    "Arivonimamo",
    "Lot 15 Tsaralalana, Antananarivo",
    "land",
  ],
  [
    "RABEMANANJARA",
    "Lova",
    "M",
    "OSE",
    "2008-06-06",
    "Antananarivo",
    "Lot 33 Behoririka, Antananarivo",
    "ljjr",
  ],
  ["RAKOTONIRINA", "Tahina", "M", "S", "2008-10-28", "Ambohidratrimo", "Lot 6 Ivandry, Antananarivo", "land"],
  ["RAZANAKOTO", "Onja", "F", "L", "2008-08-19", "Antananarivo", "Lot 21 Anosibe, Antananarivo", null],
  ["RANDRIANARISOA", "Mamy", "M", "TI", "2007-09-12", "Antananarivo", "Lot 2 Alarobia, Antananarivo", "ltpa"],
  [
    "RAHERIMALALA",
    "Soa",
    "F",
    "TT",
    "2008-02-03",
    "Ambohimanarina",
    "Lot 18 Ambohimanarina, Antananarivo",
    "ltpa",
  ],
] as const;

/** Dossiers envoyés par les écoles, pour montrer le circuit de validation. */
const APPLICATIONS = [
  {
    school: "land",
    status: "submitted",
    lastName: "RAKOTOVAO",
    firstName: "Nirina",
    gender: "F",
    serie: "S",
    birthDate: "2008-05-21",
    birthPlace: "Antananarivo",
    address: "Lot 40 Antanimena, Antananarivo",
    pieces: 6,
  },
  {
    school: "land",
    status: "submitted",
    lastName: "RASOLOFO",
    firstName: "Andry",
    gender: "M",
    serie: "OSE",
    birthDate: "2008-01-17",
    birthPlace: "Antsirabe",
    address: "Lot 7 Ampefiloha, Antananarivo",
    pieces: 6,
  },
  {
    school: "ljjr",
    status: "submitted",
    lastName: "RAFARAVAVY",
    firstName: "Holy",
    gender: "F",
    serie: "L",
    birthDate: "2008-11-02",
    birthPlace: "Antananarivo",
    address: "Lot 11 Soarano, Antananarivo",
    pieces: 5,
  },
  {
    school: "land",
    status: "incomplete",
    lastName: "RATSIMBA",
    firstName: "Feno",
    gender: "M",
    serie: "S",
    birthDate: "2007-10-09",
    birthPlace: "Ambatolampy",
    address: "Lot 5 Ankorondrano, Antananarivo",
    pieces: 4,
    note: "Acte de naissance illisible et reçu d'inscription manquant.",
  },
  {
    school: "ltpa",
    status: "draft",
    lastName: "RAZAFIMAHEFA",
    firstName: "Tovo",
    gender: "M",
    serie: "TGC",
    birthDate: "2007-12-28",
    birthPlace: "Antananarivo",
    address: "Lot 3 Alarobia, Antananarivo",
    pieces: 6,
  },
] as const;

/** Deux épreuves par jour, du lundi 16 au samedi 21 août 2027 ; l'EPS théorique clôt la semaine. */
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
  ["2027-08-20T14:00", "2027-08-20T16:00"],
] as const;
const EPS_SLOT = ["2027-08-21T07:30", "2027-08-21T09:30"] as const;

async function main() {
  const db = requireDb();
  const [existing] = await db.select().from(users).where(eq(users.username, "admin")).limit(1);
  if (existing) {
    console.log(
      "Le jeu de démonstration est déjà chargé (compte « admin » présent). Utilisez pnpm db:reset-demo.",
    );
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    const [session] = await tx
      .update(examSessions)
      .set({ examsStart: "2027-08-16", examsEnd: "2027-08-21" })
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

    // Écoles et leurs comptes
    const schoolRows = await tx
      .insert(schools)
      .values(SCHOOLS.map(({ key: _key, account: _account, ...s }) => ({ ...s, officeId: tana.id })))
      .returning();
    const schoolByKey = new Map(SCHOOLS.map((s, i) => [s.key as string, schoolRows[i]]));

    const staff = await tx
      .insert(users)
      .values([
        {
          role: "admin" as const,
          username: "admin",
          passwordHash: hash,
          fullName: "Administration nationale",
          mustChangePassword: false,
        },
        {
          role: "office" as const,
          username: "office.tana",
          passwordHash: hash,
          fullName: "Hanitra Rakotomalala",
          officeId: tana.id,
          mustChangePassword: false,
        },
        {
          role: "supervisor" as const,
          username: "surveillant.tana1",
          passwordHash: hash,
          fullName: "Jean Randrianarivelo",
          officeId: tana.id,
          mustChangePassword: false,
        },
        {
          role: "supervisor" as const,
          username: "surveillant.tana2",
          passwordHash: hash,
          fullName: "Sahondra Rabe",
          officeId: tana.id,
          mustChangePassword: false,
        },
        ...SCHOOLS.map((s) => ({
          role: "school" as const,
          username: s.account[0],
          fullName: s.account[1],
          passwordHash: hash,
          officeId: tana.id,
          schoolId: schoolByKey.get(s.key)!.id,
          mustChangePassword: false,
        })),
      ])
      .returning();
    const agent = staff[1];

    // Centres et salles
    const [c1, c2, c3] = await tx
      .insert(examCenters)
      .values([
        {
          officeId: tana.id,
          name: "Lycée Jean-Joseph Rabearivelo",
          city: "Antananarivo",
          address: "Analakely",
        },
        { officeId: tana.id, name: "Lycée Andohalo", city: "Antananarivo", address: "Andohalo" },
        { officeId: tana.id, name: "LTP d'Alarobia", city: "Antananarivo", address: "Alarobia" },
      ])
      .returning();
    const roomRows = await tx
      .insert(rooms)
      .values([
        { centerId: c1.id, name: "Salle 1", capacity: 6 },
        { centerId: c1.id, name: "Salle 2", capacity: 6 },
        { centerId: c2.id, name: "Salle A", capacity: 10 },
        { centerId: c3.id, name: "Atelier 1", capacity: 8 },
      ])
      .returning();
    await tx.insert(supervisorRooms).values([
      { supervisorId: staff[2].id, roomId: roomRows[0].id },
      { supervisorId: staff[2].id, roomId: roomRows[1].id },
      { supervisorId: staff[3].id, roomId: roomRows[2].id },
      { supervisorId: staff[3].id, roomId: roomRows[3].id },
    ]);

    // Emploi du temps publié de chaque série (hors « autres disciplines »).
    const allSubjects = await tx.select().from(subjects);
    const codeOf = new Map(allSubjects.map((s) => [s.id, s.code]));
    const autId = allSubjects.find((s) => s.code === "AUT")!.id;
    const coefs = await tx.select().from(serieSubjects).where(ne(serieSubjects.subjectId, autId));
    for (const serie of [...new Set(coefs.map((c) => c.serieCode))]) {
      const list = coefs
        .filter((c) => c.serieCode === serie && codeOf.get(c.subjectId) !== "EPS")
        .sort((a, b) => b.coefficient - a.coefficient);
      const eps = coefs.find((c) => c.serieCode === serie && codeOf.get(c.subjectId) === "EPS");
      const rows: { subjectId: number; slot: readonly [string, string] }[] = list
        .slice(0, SLOTS.length)
        .map((s, i) => ({ subjectId: s.subjectId, slot: SLOTS[i] }));
      if (eps) rows.push({ subjectId: eps.subjectId, slot: EPS_SLOT });
      await tx.insert(exams).values(
        rows.map((r) => ({
          sessionId: session.id,
          serieCode: serie,
          subjectId: r.subjectId,
          startsAt: parseLocalDateTime(r.slot[0])!,
          endsAt: parseLocalDateTime(r.slot[1])!,
          isPublished: true,
        })),
      );
    }

    // Candidats déjà enregistrés (dossiers validés) et candidats libres
    const created: { matricule: string; password: string; name: string }[] = [];
    for (const [
      lastName,
      firstName,
      gender,
      serieCode,
      birthDate,
      birthPlace,
      address,
      schoolKey,
    ] of CANDIDATES) {
      const school = schoolKey ? schoolByKey.get(schoolKey)! : null;
      const { candidate, password } = await registerCandidate(
        {
          officeId: tana.id,
          lastName,
          firstName,
          gender,
          serieCode,
          birthDate,
          birthPlace,
          address,
          kind: school ? "ecole" : "libre",
          schoolId: school?.id ?? null,
          schoolName: school?.name ?? null,
        },
        agent.id,
        tx,
      );
      created.push({ matricule: candidate.matricule, password, name: `${firstName} ${lastName}` });
    }
    await assignRooms(tana.id, agent.id, tx);

    // Dossiers en cours dans le circuit école → Office
    const batches = new Map<string, number>();
    for (const a of APPLICATIONS) {
      const school = schoolByKey.get(a.school)!;
      if (a.status !== "draft" && !batches.has(a.school)) {
        const count = APPLICATIONS.filter(
          (x) => x.school === a.school && (x.status as string) !== "draft",
        ).length;
        const [b] = await tx
          .insert(applicationBatches)
          .values({ schoolId: school.id, sessionId: session.id, count })
          .returning({ id: applicationBatches.id });
        batches.set(a.school, b.id);
      }
      const now = new Date();
      await tx.insert(applications).values({
        schoolId: school.id,
        sessionId: session.id,
        batchId: a.status === "draft" ? null : batches.get(a.school),
        status: a.status,
        lastName: a.lastName,
        firstName: a.firstName,
        gender: a.gender,
        serieCode: a.serie,
        birthDate: a.birthDate,
        birthPlace: a.birthPlace,
        address: a.address,
        pieces: PIECES.slice(0, a.pieces),
        submittedAt: a.status === "draft" ? null : now,
        reviewNote: "note" in a ? a.note : null,
        reviewedBy: a.status === "incomplete" ? agent.id : null,
        reviewedAt: a.status === "incomplete" ? now : null,
      });
    }

    // Actualité proposée par l'Office, en attente de l'Admin
    await tx.insert(news).values({
      slug: `permanence-office-antananarivo-${Date.now().toString(36)}`,
      title: "Permanence de l'Office du Bac d'Antananarivo pour les candidats libres",
      excerpt: "Accueil des candidats libres tous les mercredis matin jusqu'à la clôture des inscriptions.",
      body: "L'Office du Bac d'Antananarivo accueille les candidats libres tous les mercredis, de 8 h à 12 h, pour les aider à constituer leur dossier.\n\nMunissez-vous de votre acte de naissance, de deux photos d'identité et du reçu du droit d'inscription.",
      category: "Office du Bac",
      importance: "normal",
      illustration: "inscription",
      reviewStatus: "pending",
      proposedBy: agent.id,
      proposedByLabel: tana.name,
    });

    // Apprentissage (application Mianara Mobile) : enseignants, contenus, tutorat
    await seedLearning(tx, hash);

    console.log("\n✓ Jeu de démonstration chargé.\n");
    console.log(`Personnel et écoles (mot de passe : ${PASSWORD})`);
    console.log("  admin               Administration nationale");
    console.log("  office.tana         Office du Bac d'Antananarivo");
    console.log("  surveillant.tana1   Surveillant (Salles 1 et 2)");
    console.log("  ecole.andohalo      Lycée Andohalo (dossiers envoyés, un incomplet)");
    console.log("  ecole.rabearivelo   Lycée Jean-Joseph Rabearivelo");
    console.log("  ecole.alarobia      Lycée technique d'Alarobia (Bac technique)");
    console.log("  prof.maths · prof.francais · prof.philo   Enseignants (application Mianara Mobile)\n");
    console.log("Candidats (mot de passe temporaire, à changer à la 1re connexion)");
    for (const c of created.slice(0, 4)) console.log(`  ${c.matricule}   ${c.password}   ${c.name}`);
    console.log("  … les autres identifiants figurent sur leur convocation.\n");
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
