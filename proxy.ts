import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Redirection optimiste des visites de pages non authentifiées vers /login.
// La sécurité réelle est appliquée dans les Route Handlers (lib/session) ;
// ce proxy ne fait que de l'UX. Pas d'import Prisma ici.
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
];

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  const protectedPage =
    pathname === "/" || pathname.startsWith("/watches/") || pathname.startsWith("/admin/");
  if (!protectedPage) return NextResponse.next();
  if (hasSessionCookie(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/watches/:path*", "/admin/:path*"],
};
