import { handler, json } from "@/lib/mobile-api";

/** Test de joignabilité depuis l'application (écran de connexion) : ne touche pas à la base. */
export const GET = handler(async () => json({ ok: true, app: "mianara", serverTime: new Date().toISOString() }));
