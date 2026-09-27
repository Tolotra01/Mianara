/**
 * Verifie le parcours enseignant/cours contre la base reelle, puis annule la
 * transaction : aucune donnee de test n'est conservee.
 *
 *   node node_modules/tsx/dist/cli.mjs scripts/check-teacher-flow.ts
 */
import "dotenv/config";
import "../src/db/network";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { requireTxDb } from "../src/db";
import { subjects } from "../src/db/schema";
import { candidates, courseEnrollments, courses, teacherSubjects, teachers, users } from "../src/db/schema-gestion";

const ok = (label: string) => console.log(`  OK   ${label}`);
const assert = (cond: unknown, label: string) => {
  if (!cond) throw new Error(`ECHEC: ${label}`);
  ok(label);
};

async function main() {
  const db = requireTxDb();
  try {
    await db.transaction(async (tx) => {
      const [admin] = await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
      const [cand] = await tx
        .select({ id: candidates.id, serieCode: candidates.serieCode })
        .from(candidates)
        .limit(1);
      const [subject] = await tx.select({ id: subjects.id }).from(subjects).limit(1);
      assert(admin && cand && subject, "donnees de reference presentes (admin, candidat, matiere)");
      console.log(`  (admin=${admin.id} candidat=${cand.id} serie=${cand.serieCode} matiere=${subject.id})`);

      /* 1. L'admin cree un enseignant libre. */
      const [teacherUser] = await tx
        .insert(users)
        .values({ role: "teacher", username: "ens.fumee", passwordHash: "x", fullName: "Enseignant Fumee" })
        .returning({ id: users.id });
      const [teacher] = await tx
        .insert(teachers)
        .values({ userId: teacherUser.id, city: "Antananarivo", yearsExperience: 5, createdBy: admin.id })
        .returning({ id: teachers.id });
      await tx.insert(teacherSubjects).values({ teacherId: teacher.id, subjectId: subject.id });
      ok("enseignant cree (utilisateur + fiche + matiere)");

      const [link] = await tx.select().from(teachers).where(eq(teachers.userId, teacherUser.id));
      assert(link, "fiche enseignant reliee a l'utilisateur");

      /* 2. L'enseignant publie un cours en brouillon. */
      const [course] = await tx
        .insert(courses)
        .values({
          teacherId: teacher.id,
          subjectId: subject.id,
          serieCode: cand.serieCode,
          title: "Cours fumee",
          description: "Description du cours de fumee.",
          priceAriary: 0,
          capacity: 1,
        })
        .returning({ id: courses.id, status: courses.status });
      assert(course.status === "draft", "cours cree en brouillon");
      ok(`cours #${course.id} en brouillon`);

      /* 3. Un candidat reserve le cours. */
      const [enroll] = await tx
        .insert(courseEnrollments)
        .values({ courseId: course.id, candidateId: cand.id, status: "pending" })
        .returning({ id: courseEnrollments.id });
      ok(`reservation #${enroll.id} en attente`);

      const taken = async () => {
        const [r] = await tx
          .select({ taken: count() })
          .from(courseEnrollments)
          .where(
            and(
              eq(courseEnrollments.courseId, course.id),
              inArray(courseEnrollments.status, ["pending", "confirmed"]),
            ),
          );
        return r?.taken ?? 0;
      };
      assert((await taken()) === 1, "1 place occupee (statuts pending et confirmed)");

      /* 5. Annulation puis reactivation : c'est le chemin que suit reserveCourse. */
      await tx.update(courseEnrollments).set({ status: "cancelled" }).where(eq(courseEnrollments.id, enroll.id));
      assert((await taken()) === 0, "annulation libere la place");
      const [reactivated] = await tx
        .update(courseEnrollments)
        .set({ status: "pending", updatedAt: new Date() })
        .where(eq(courseEnrollments.id, enroll.id))
        .returning({ status: courseEnrollments.status });
      assert(reactivated.status === "pending", "reservation annulee reactivee sans doublon");
      assert((await taken()) === 1, "la place est de nouveau occupee");

      /* 6. L'enseignant confirme. */
      await tx.update(courseEnrollments).set({ status: "confirmed" }).where(eq(courseEnrollments.id, enroll.id));
      assert((await taken()) === 1, "la reservation confirme occupe toujours sa place");

      /* 7. Requetes des pages, telles qu'elles sont ecrites. */
      await tx.update(courses).set({ status: "open" }).where(eq(courses.id, course.id));
      const list = await tx
        .select({ id: courses.id })
        .from(courses)
        .innerJoin(subjects, eq(subjects.id, courses.subjectId))
        .innerJoin(teachers, eq(teachers.id, courses.teacherId))
        .innerJoin(users, eq(users.id, teachers.userId))
        .where(and(eq(courses.status, "open"), eq(users.isActive, true)));
      assert(list.some((r) => r.id === course.id), "requete catalogue candidat");

      const bySubject = await tx
        .select({ id: subjects.id, name: subjects.name, n: count(courses.id) })
        .from(courses)
        .innerJoin(subjects, eq(subjects.id, courses.subjectId))
        .innerJoin(teachers, eq(teachers.id, courses.teacherId))
        .innerJoin(users, eq(users.id, teachers.userId))
        .where(and(eq(courses.status, "open"), eq(users.isActive, true)))
        .groupBy(subjects.id, subjects.name);
      assert(bySubject.length > 0, "requete compteurs par matiere");

      const [stats] = await tx
        .select({
          total: sql<number>`count(distinct ${teachers.id})::int`,
          active: sql<number>`count(distinct ${teachers.id}) filter (where ${users.isActive} = true)::int`,
          open: sql<number>`count(${courses.id}) filter (where ${courses.status} = 'open')::int`,
        })
        .from(teachers)
        .innerJoin(users, eq(users.id, teachers.userId))
        .leftJoin(courses, eq(courses.teacherId, teachers.id));
      assert(stats.total === 1, `statistiques admin : 1 enseignant compte (obtenu ${stats.total})`);
      assert(stats.open === 1, `statistiques admin : 1 cours ouvert (obtenu ${stats.open})`);
      ok("requete statistiques admin (pas de double comptage)");

      /* 8. Desactivation : le cours disparait du catalogue. */
      await tx.update(users).set({ isActive: false }).where(eq(users.id, teacherUser.id));
      const afterDisable = await tx
        .select({ id: courses.id })
        .from(courses)
        .innerJoin(teachers, eq(teachers.id, courses.teacherId))
        .innerJoin(users, eq(users.id, teachers.userId))
        .where(and(eq(courses.status, "open"), eq(users.isActive, true)));
      assert(!afterDisable.some((r) => r.id === course.id), "cours masque quand l'enseignant est desactive");

      /* 9. La contrainte unique bloque une deuxieme ligne pour le meme candidat.
         Cette verification provoque volontairement une erreur, qui annule la
         transaction : elle est donc placee en dernier. */
      let uniqueBlocked = false;
      try {
        await tx.insert(courseEnrollments).values({ courseId: course.id, candidateId: cand.id, status: "pending" });
      } catch {
        uniqueBlocked = true;
      }
      assert(uniqueBlocked, "contrainte unique (cours, candidat) bien appliquee");

      throw new Error("__ROLLBACK__");
    });
  } catch (err) {
    // La transaction est volontairement avortee : rien ne doit subsister du test.
    if ((err as Error).message !== "__ROLLBACK__") throw err;
    console.log("\nParcours valide. Transaction annulee : aucune donnee de test conservee.");
  }
}

main();
