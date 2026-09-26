import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { examSessions } from "@/db/schema";
import { ENTRY_OPENS_MIN, END_CLOSES_MIN } from "@/lib/bac-rules";
import { handler, json, mobileUser, publicKey } from "@/lib/mobile-api";
import { MAX_DRIFT_SECONDS } from "@/lib/services/mobile-sync";

/** Profil, session en cours, clé de vérification des QR et règles de contrôle. */
export const GET = handler(async (request: Request) => {
  const user = await mobileUser(request, { allowPasswordChange: true });
  const [session] = await requireDb()
    .select()
    .from(examSessions)
    .where(eq(examSessions.isCurrent, true))
    .limit(1);
  return json({
    user: {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      officeId: user.officeId,
      officeName: user.officeName,
      mustChangePassword: user.mustChangePassword,
    },
    session: session ? { id: session.id, year: session.year } : null,
    qrPublicKey: publicKey(),
    serverTime: new Date().toISOString(),
    rules: {
      entryOpensMinutes: ENTRY_OPENS_MIN,
      endClosesMinutes: END_CLOSES_MIN,
      maxDriftSeconds: MAX_DRIFT_SECONDS,
      timeZone: "Indian/Antananarivo",
      utcOffsetMinutes: 180,
    },
  });
});
