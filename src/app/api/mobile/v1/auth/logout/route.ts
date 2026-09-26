import { destroyToken } from "@/lib/auth";
import { bearer, handler, json } from "@/lib/mobile-api";

export const POST = handler(async (request: Request) => {
  const token = bearer(request);
  if (token) await destroyToken(token);
  return json({ ok: true });
});
