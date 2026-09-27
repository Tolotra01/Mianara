import { destroyToken } from "@/lib/auth";
import { bearer } from "@/lib/mobile-api";
import { learnHandler, learnJson } from "@/lib/learn-api";

export const POST = learnHandler(async (request: Request) => {
  const token = bearer(request);
  if (token) await destroyToken(token);
  return learnJson({ loggedOut: true });
});
