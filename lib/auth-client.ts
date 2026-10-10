"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/**
 * Client Better Auth — point d'entrée unique côté navigateur.
 * `baseURL` suit l'origine courante (reverse-proxy / base path agnostique) ;
 * sans `window` (SSR) on laisse le défaut relatif du client.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [adminClient()],
});

export const { signIn, signOut, useSession, admin } = authClient;

export type AdminRole = "admin" | "user";

export function sessionRole(
  session: ReturnType<typeof useSession>["data"]
): AdminRole | null {
  const role = (session?.user as { role?: string | null } | undefined)?.role;
  return role === "admin" || role === "user" ? role : null;
}

export function isAdminSession(
  session: ReturnType<typeof useSession>["data"]
): boolean {
  return sessionRole(session) === "admin";
}
