import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { strings as t } from "@/lib/strings";

export const metadata: Metadata = {
  title: {
    default: t.meta.titleDefault,
    template: t.meta.titleTemplate,
  },
  description: t.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <div className="app-backdrop" aria-hidden="true" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
            <p className="border-t border-border pt-5 text-xs text-muted-foreground">
              {t.meta.footer}
            </p>
          </footer>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
