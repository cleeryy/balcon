"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function letterOf(url: string) {
  const host = hostOf(url).replace(/^www\./, "");
  return (host[0] ?? "?").toUpperCase();
}

/** Favicon du site surveillé, avec repli sur une plaque à initiale. */
export function SiteFavicon({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);

  if (!host || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft font-display text-sm font-bold text-primary",
          className
        )}
      >
        {letterOf(url)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- favicon externe, sans config images
    <img
      src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={(e) => {
        // Le service renvoie un carré gris 48×48 quand il ne trouve rien :
        // on affiche alors la plaque à initiale, plus lisible.
        const img = e.currentTarget;
        if (img.naturalWidth === 48 && img.naturalHeight === 48) setFailed(true);
      }}
      className={cn(
        "h-9 w-9 shrink-0 rounded-lg border border-border bg-card p-1.5 object-contain",
        className
      )}
    />
  );
}
