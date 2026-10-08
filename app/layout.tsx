import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "balcon", description: "Clone moderne de changedetection.io" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-bold tracking-tight">🪟 balcon</a>
            <span className="text-xs text-neutral-500">surveillance de pages web</span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
