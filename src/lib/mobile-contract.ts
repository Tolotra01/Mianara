import { z } from "zod";
import { passwordProblem } from "./password";

const Revision = z
  .object({
    id: z.uuid(),
    subject: z.string().trim().min(1).max(40),
    startedAt: z.string().max(40).pipe(z.iso.datetime({ offset: true })),
    endedAt: z.string().max(40).pipe(z.iso.datetime({ offset: true })),
    progress: z.number().int().min(0).max(100),
  })
  .strict();

export type MobileRevision = z.infer<typeof Revision>;

/** Validates offline revision payloads against the current clock; no server-owned fields are accepted. */
export function mobileRevisionBatchSchema(now = new Date()) {
  return z
    .object({
      revisions: z.array(Revision).max(100),
    })
    .strict()
    .superRefine(({ revisions }, ctx) => {
      const ids = new Set<string>();
      const latestAllowed = now.getTime() + 5 * 60_000;
      const earliestAllowed = now.getTime() - 5 * 365 * 86400_000;

      revisions.forEach((revision, index) => {
        if (ids.has(revision.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["revisions", index, "id"],
            message: "Chaque session doit avoir un identifiant client unique.",
          });
        }
        ids.add(revision.id);

        const startedAt = Date.parse(revision.startedAt);
        const endedAt = Date.parse(revision.endedAt);
        if (
          startedAt < earliestAllowed ||
          endedAt < earliestAllowed ||
          startedAt > latestAllowed ||
          endedAt > latestAllowed ||
          endedAt < startedAt ||
          endedAt - startedAt > 24 * 60 * 60_000
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["revisions", index],
            message: "Dates de révision invalides.",
          });
        }
      });
    });
}

export const MOBILE_LOGIN_BODY = z
  .object({
    identifiant: z.string().trim().min(1).max(120),
    password: z.string().min(1).max(1024),
  })
  .strict();

export const MOBILE_CHANGE_PASSWORD_BODY = z
  .object({
    currentPassword: z.string().min(1).max(1024),
    newPassword: z.string().min(1).max(1024),
  })
  .strict()
  .superRefine(({ currentPassword, newPassword }, ctx) => {
    const problem = passwordProblem(newPassword);
    if (problem) {
      ctx.addIssue({ code: "custom", path: ["newPassword"], message: problem });
    }
    if (currentPassword === newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Choisissez un mot de passe différent de l'actuel.",
      });
    }
  });
