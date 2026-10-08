const FETCHER_URL = process.env.FETCHER_URL ?? "http://localhost:8000";
const ENABLE_FLARESOLVERR = process.env.ENABLE_FLARESOLVERR === "true";
const FLARESOLVERR_URL =
  process.env.FLARESOLVERR_URL ?? "http://flaresolverr:8191";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export interface FetchResult {
  ok: boolean;
  status: number;
  html: string;
  cfChallenge: boolean;
  via: "fetcher" | "direct" | "flaresolverr";
  error?: string;
}

interface SidecarPayload {
  ok: boolean;
  status: number;
  html: string;
  cfChallenge: boolean;
  error?: string;
}

/**
 * Chaîne de fallback :
 *  1. sidecar curl_cffi (10s) — fetch principal
 *  2. fetch direct natif Node (10s) — filet single-container (pas de sidecar)
 *  3. FlareSolverr (15s) si challenge CF détecté et ENABLE_FLARESOLVERR=true
 */
export async function fetchPage(url: string, impersonate = "chrome"): Promise<FetchResult> {
  // 1. sidecar curl_cffi (10s)
  const sidecar = await fetchViaSidecar(url, impersonate);
  if (sidecar.ok) return sidecar;

  // 2. fetch direct natif (10s), sauf si le sidecar a déjà détecté un challenge CF
  //    (le direct ne passera pas non plus, on garde quand même une tentative : cheap et instructive)
  const direct = await fetchDirect(url);
  if (direct.ok) return direct;

  // 3. FlareSolverr si challenge CF détecté côté sidecar ou direct
  const cf = sidecar.cfChallenge || direct.cfChallenge;
  if (ENABLE_FLARESOLVERR && cf) {
    const fl = await fetchViaFlareSolverr(url);
    if (fl) return fl;
    return {
      ok: false,
      status: direct.status || sidecar.status,
      html: "",
      cfChallenge: true,
      via: "flaresolverr",
      error: `[flaresolverr] challenge CF non résolu pour ${url}`,
    };
  }

  // Erreur propre : message le plus parlant (direct d'abord, il reflète la réalité réseau du container)
  const best = direct.error ? direct : sidecar;
  return {
    ok: false,
    status: best.status,
    html: "",
    cfChallenge: cf,
    via: best.via,
    error: best.error ?? "[fetcher] unknown error",
  };
}

function sidecarConnError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/i.test(msg)) {
    return `[fetcher] connection refused (${FETCHER_URL})`;
  }
  if (/abort|timeout/i.test(msg)) {
    return `[fetcher] timeout after 10s (${FETCHER_URL})`;
  }
  return `[fetcher] ${msg}`;
}

async function fetchViaSidecar(url: string, impersonate: string): Promise<FetchResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${FETCHER_URL}/fetch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, impersonate }),
      signal: ctrl.signal,
    });
    const data = (await res.json()) as SidecarPayload;
    if (data.ok) {
      return { ok: true, status: data.status, html: data.html, cfChallenge: false, via: "fetcher" };
    }
    return {
      ok: false,
      status: data.status ?? 0,
      html: "",
      cfChallenge: data.cfChallenge === true,
      via: "fetcher",
      error: data.error ? `[fetcher] ${data.error}` : `[fetcher] HTTP ${data.status ?? 0}`,
    };
  } catch (e) {
    return { ok: false, status: 0, html: "", cfChallenge: false, via: "fetcher", error: sidecarConnError(e) };
  } finally {
    clearTimeout(t);
  }
}

function looksLikeCfChallenge(status: number, headers: Headers, body: string): boolean {
  if (![401, 403, 503].includes(status)) return false;
  const server = headers.get("server") ?? "";
  if (/cloudflare/i.test(server)) return true;
  if (headers.has("cf-mitigated") || headers.has("cf-ray")) return true;
  return /challenge-platform|cf-challenge|just a moment|cf_clearance|attention required/i.test(body);
}

async function fetchDirect(url: string): Promise<FetchResult> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": CHROME_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const body = await res.text().catch(() => "");
    if (res.ok) {
      return { ok: true, status: res.status, html: body, cfChallenge: false, via: "direct" };
    }
    const cf = looksLikeCfChallenge(res.status, res.headers, body);
    return {
      ok: false,
      status: res.status,
      html: "",
      cfChallenge: cf,
      via: "direct",
      error: cf
        ? `[direct] HTTP ${res.status} ${res.statusText} — challenge Cloudflare détecté`
        : `[direct] HTTP ${res.status} ${res.statusText}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/abort/i.test(msg)) {
      return { ok: false, status: 0, html: "", cfChallenge: false, via: "direct", error: "[direct] timeout after 10s" };
    }
    if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(msg)) {
      return { ok: false, status: 0, html: "", cfChallenge: false, via: "direct", error: `[direct] connection refused (${msg})` };
    }
    return { ok: false, status: 0, html: "", cfChallenge: false, via: "direct", error: `[direct] ${msg}` };
  } finally {
    clearTimeout(t);
  }
}

async function fetchViaFlareSolverr(url: string): Promise<FetchResult | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${FLARESOLVERR_URL}/v1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: 15000,
      }),
      signal: ctrl.signal,
    });
    const data = (await res.json()) as {
      status: string;
      solution?: { response?: string; status?: number };
      message?: string;
    };
    if (data.status === "ok" && data.solution?.response) {
      return {
        ok: true,
        status: data.solution.status ?? 200,
        html: data.solution.response,
        cfChallenge: false,
        via: "flaresolverr",
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
