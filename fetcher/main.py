"""Sidecar fetcher balcon : fetch principal via curl_cffi (impersonate chrome)."""
import re
import time
from typing import Optional

import httpx
from curl_cffi import requests as cffi_requests
from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="balcon-fetcher")

CF_PATTERNS = re.compile(
    r"challenge-platform|cf-challenge|Just a moment|cf_clearance|Attention Required|cf-error",
    re.IGNORECASE,
)


class FetchRequest(BaseModel):
    url: HttpUrl
    impersonate: Optional[str] = "chrome"


class FetchResponse(BaseModel):
    ok: bool
    status: int
    html: str = ""
    cfChallenge: bool = False
    error: Optional[str] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "balcon-fetcher"}


@app.post("/fetch", response_model=FetchResponse)
def do_fetch(body: FetchRequest):
    url = str(body.url)
    impersonate = body.impersonate or "chrome"
    started = time.time()
    try:
        # fetch principal curl_cffi, timeout 10s
        resp = cffi_requests.get(
            url,
            impersonate=impersonate,  # type: ignore[arg-type]
            timeout=10,
            headers={"User-Agent": "Mozilla/5.0"},
            allow_redirects=True,
        )
        html = resp.text or ""
        cf = bool(
            resp.status_code in (401, 403, 503)
            and (CF_PATTERNS.search(html) or "cloudflare" in html.lower())
        )
        if cf:
            return FetchResponse(
                ok=False, status=resp.status_code, cfChallenge=True,
                error=f"cloudflare challenge detected (HTTP {resp.status_code})",
            )
        if resp.status_code >= 400:
            return FetchResponse(ok=False, status=resp.status_code, cfChallenge=False,
                                 error=f"HTTP {resp.status_code}")
        return FetchResponse(ok=True, status=resp.status_code, html=html)
    except Exception as e:
        elapsed = time.time() - started
        return FetchResponse(ok=False, status=0, cfChallenge=False,
                             error=f"{type(e).__name__}: {e} ({elapsed:.1f}s)")
