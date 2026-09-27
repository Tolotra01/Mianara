import { learnHandler, learnJson, learnUser } from "@/lib/learn-api";
import { candidateSessions, teacherSessions } from "@/lib/services/learning";

/** Séances de tutorat : celles de l'élève, ou celles de l'enseignant (élèves anonymisés). */
export const GET = learnHandler(async (request: Request) => {
  const { user } = await learnUser(request);
  if (user.role === "teacher") {
    const rows = await teacherSessions(user.id);
    return learnJson({
      sessions: rows.map((s) => ({
        id: s.id,
        subjectCode: s.subjectCode,
        teacherSubject: s.subjectName,
        title: s.title,
        pupil: s.pupil,
        status: s.status,
        unread: s.unread,
        lastText: s.lastText,
        lastAt: s.lastAt ? new Date(s.lastAt).toISOString() : null,
      })),
    });
  }
  const rows = await candidateSessions(user.id);
  return learnJson({
    sessions: rows.map((s) => ({
      id: s.id,
      listingId: s.listingId,
      subjectCode: s.subjectCode,
      teacherSubject: s.teacherSubject,
      title: s.title,
      status: s.status,
      unread: s.unread,
      lastAt: s.lastAt ? new Date(s.lastAt).toISOString() : null,
    })),
  });
});
