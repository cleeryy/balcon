import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role?: string | null;
}

export interface SessionResult {
  user: SessionUser;
  session: { id: string };
}

/** Lit la session Better Auth depuis les headers de la requête (Next 16 Route Handlers). */
export async function getSessionUser(req: Request): Promise<SessionResult | null> {
  const data = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (!data?.user || !data?.session) return null;
  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      role: (data.user as { role?: string | null }).role ?? null,
    },
    session: { id: data.session.id },
  };
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * Exige une session valide. Retourne `{ response }` (401 JSON) si absente,
 * sinon `{ user }`.
 */
export async function requireUser(
  req: Request
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const s = await getSessionUser(req);
  if (!s) return { response: unauthorized() };
  return { user: s.user };
}

/**
 * Exige un admin (`role === "admin"`).
 * - pas de session → 401
 * - session non-admin → **404** (pas 403 : anti-énumération sur les routes ressource)
 */
export async function requireAdmin(
  req: Request
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const s = await getSessionUser(req);
  if (!s) return { response: unauthorized() };
  if (s.user.role !== "admin") {
    return { response: NextResponse.json({ error: "not found" }, { status: 404 }) };
  }
  return { user: s.user };
}
