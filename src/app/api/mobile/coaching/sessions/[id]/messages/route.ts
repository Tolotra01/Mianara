import { z } from "zod";
import { LearnError, learnHandler, learnJson, learnUser, readJson } from "@/lib/learn-api";
import { postMessage, sessionFor, sessionMessages } from "@/lib/services/learning";

type Ctx = { params: Promise<{ id: string }> };

async function load(request: Request, ctx: Ctx) {
  const { user } = await learnUser(request);
  const session = await sessionFor((await ctx.params).id, user);
  if (!session) throw new LearnError(404, "NOT_FOUND", "Séance de tutorat introuvable.");
  return { user, session };
}

/** Fil de la séance ; les messages de l'autre partie passent en « lus ». */
export const GET = learnHandler(async (request: Request, ctx: Ctx) => {
  const { session } = await load(request, ctx);
  return learnJson({
    session: {
      id: session.s.id,
      status: session.s.status,
      subject: session.subjectName,
      title: session.title,
      me: session.side,
    },
    messages: await sessionMessages(session.s.id, session.side),
  });
});

const Body = z.object({ text: z.string().trim().min(1).max(2000) });

export const POST = learnHandler(async (request: Request, ctx: Ctx) => {
  const { user, session } = await load(request, ctx);
  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) throw new LearnError(400, "INVALID", "Message vide ou trop long.");
  const res = await postMessage(session, user.id, parsed.data.text);
  if ("error" in res) throw new LearnError(409, "CLOSED", res.error!);
  return learnJson({ message: res.message }, { status: 201 });
});
