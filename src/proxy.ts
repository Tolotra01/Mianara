import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mianara_session";
const PROTECTED = ["/candidat", "/office", "/admin", "/surveillant", "/compte", "/enseignant"];

/**
 * Vérification optimiste : sans cookie de session, on renvoie vers la connexion.
 * Le contrôle réel (session valide, rôle, Office) est fait sur chaque page et
 * chaque action serveur (src/lib/auth.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !request.cookies.has(SESSION_COOKIE)
  ) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("suite", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/candidat/:path*",
    "/office/:path*",
    "/admin/:path*",
    "/surveillant/:path*",
    "/compte/:path*",
    "/enseignant/:path*",
  ],
};
