import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { authSessions } from "@/db/schema-gestion";
import { getMobileBearerToken, mobileJson } from "@/lib/mobile-api";
import { sha256 } from "@/lib/crypto";

export async function POST(request: Request) {
  const token = getMobileBearerToken(request);
  if (!token) return mobileJson({ error: "Jeton Bearer invalide." }, 401);

  try {
    await requireDb()
      .delete(authSessions)
      .where(eq(authSessions.id, sha256(token)));
    return mobileJson({ loggedOut: true });
  } catch (error) {
    console.error("Mobile logout:", error);
    return mobileJson({ error: "Service momentanément indisponible." }, 503);
  }
}
