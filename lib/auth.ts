import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { prisma } from "@/lib/prisma";

// Phase 1 — closed instance: sign-ups are always disabled, on both
// email/password and OIDC. Users are created by an admin.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Allow static analysis during `next build` (route collection imports
    // this module without env); the check still throws at runtime.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return "";
    }
    throw new Error(`[auth] missing required environment variable ${name}`);
  }
  return value;
}

const secret = requireEnv("BETTER_AUTH_SECRET");
const baseURL = requireEnv("BETTER_AUTH_URL");

const oidcIssuer = process.env.OIDC_ISSUER;
const oidcClientId = process.env.OIDC_CLIENT_ID;
const oidcClientSecret = process.env.OIDC_CLIENT_SECRET;

const oidcConfigured = Boolean(oidcIssuer && oidcClientId && oidcClientSecret);

export const auth = betterAuth({
  secret,
  baseURL,
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  account: {
    // XChaCha20-Poly1305 encryption of stored OAuth tokens (supported in 1.7.7).
    encryptOAuthTokens: true,
  },
  plugins: [
    admin(),
    // Static OIDC provider, registered only when ALL credentials are set.
    // The client secret is passed straight to the provider config and is
    // never logged or persisted anywhere in the codebase.
    ...(oidcConfigured
      ? [
          genericOAuth({
            config: [
              {
                providerId: "oidc",
                discoveryUrl: `${oidcIssuer}/.well-known/openid-configuration`,
                clientId: oidcClientId as string,
                clientSecret: oidcClientSecret as string,
                pkce: true,
                requireIdTokenVerification: true,
                disableSignUp: true,
              },
            ],
          }),
        ]
      : []),
  ],
});
