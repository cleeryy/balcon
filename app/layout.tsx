import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { LocaleProvider } from "@/components/locale-provider";
import { Toaster } from "@/components/ui/sonner";
import { getDict, LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";

/** The locale is read from the cookie so SSR and the client agree on `lang`. */
async function requestLocale() {
  const store = await cookies();
  return resolveLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const t = getDict(await requestLocale());
  return {
    title: {
      default: t.meta.titleDefault,
      template: t.meta.titleTemplate,
    },
    description: t.meta.description,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await requestLocale();
  const t = getDict(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen">
        <div className="app-backdrop" aria-hidden="true" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LocaleProvider locale={locale}>
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
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
