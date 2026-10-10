import { NextResponse } from "next/server";

// Public: lets the login page show the OIDC button only when the provider
// is configured. Never exposes the client secret or full issuer URL.
export async function GET() {
  const enabled = Boolean(
    process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
  );
  return NextResponse.json({ enabled });
}
