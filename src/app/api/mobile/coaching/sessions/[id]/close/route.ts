import { LearnError, learnHandler, learnJson, learnUser } from "@/lib/learn-api";
import { closeSession } from "@/lib/services/learning";

/** L'enseignant clôture une séance terminée. */
export const POST = learnHandler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { user } = await learnUser(request, { roles: ["teacher"] });
  const res = await closeSession((await ctx.params).id, user.id);
  if ("error" in res) throw new LearnError(409, "NOT_ACTIVE", res.error!);
  return learnJson({ closed: true });
});
