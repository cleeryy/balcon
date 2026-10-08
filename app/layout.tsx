import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: {
    default: "balcon — veille de pages web",
    template: "%s · balcon",
  },
  description:
    "balcon surveille vos pages web, détecte les changements et vous prévient par email ou webhook.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen">
        <div className="app-backdrop" aria-hidden="true" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
            <p className="border-t border-border pt-5 text-xs text-muted-foreground">
              balcon — veille de pages web, hébergée chez vous.
            </p>
          </footer>
          <ToastProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
