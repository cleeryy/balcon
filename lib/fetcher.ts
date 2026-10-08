const FETCHER_URL = process.env.FETCHER_URL ?? "http://localhost:8000";
const ENABLE_FLARESOLVERR = process.env.ENABLE_FLARESOLVERR === "true";
const FLARESOLVERR_URL =
  process.env.FLARESOLVERR_URL ?? "http://flaresolverr:8191";

export interface FetchResult {
  ok: boolean;
  status: number;
  html: string;
  cfChallenge: boolean;
  via: "fetcher" | "flaresolverr";
  error?: string;
}

export async function fetchPage(url: string, impersonate = "chrome"): Promise<FetchResult> {
  // 1. fetcher curl_cffi (10s)
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${FETCHER_URL}/fetch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, impersonate }),
      signal: ctrl.signal,
    });
    const data = (await res.json()) as {
      ok: boolean;
      status: number;
      html: string;
      cfChallenge: boolean;
      error?: string;
    };
    if (data.ok) {
      return { ok: true, status: data.status, html: data.html, cfChallenge: false, via: "fetcher" };
    }
    // 2. FlareSolverr optionnel si erreur CF (15s)
    if (ENABLE_FLARESOLVERR && data.cfChallenge) {
      const fl = await fetchViaFlareSolverr(url);
      if (fl) return fl;
    }
    return {
      ok: false,
      status: data.status ?? 0,
      html: "",
      cfChallenge: data.cfChallenge,
      via: "fetcher",
      error: data.error ?? "fetcher error",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return { ok: false, status: 0, html: "", cfChallenge: false, via: "fetcher", error: msg };
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
