"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Logo } from "@/components/logo";
import { SessionMenu } from "@/components/session-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useDict } from "@/components/locale-provider";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function SiteHeader() {
  const t = useDict();
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo className="h-8 w-8 shrink-0 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
          <span className="font-display text-lg font-bold leading-none tracking-tight">balcon</span>
          <span className="hidden border-l border-border pl-2.5 text-xs text-muted-foreground sm:inline">
            {t.header.tagline}
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1.5">
          {!onHome && (
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
            >
              <LayoutGrid className="h-4 w-4" />
              {t.header.dashboard}
            </Link>
          )}
          <a
            href="https://github.com/cleeryy/balcon"
            target="_blank"
            rel="noreferrer"
            aria-label={t.header.githubRepo}
            title={t.header.githubRepo}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <GithubMark className="h-4 w-4" />
          </a>
          <LocaleSwitcher />
          <ThemeToggle />
          <SessionMenu />
        </nav>
      </div>
    </header>
  );
}
