"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useDict } from "@/components/locale-provider";
import { signIn } from "@/lib/auth-client";

function ssoErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

/** Formulaire de connexion email/mot de passe + bouton SSO conditionnel. */
export function LoginForm() {
  const t = useDict();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/oidc-status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        if (!alive) return;
        const enabled =
          typeof body === "object" && body !== null && "enabled" in body
            ? (body as { enabled?: unknown }).enabled === true
            : false;
        setSsoEnabled(enabled);
      })
      .catch(() => {
        /* SSO caché en cas d'erreur : la connexion email reste disponible. */
      });
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn.email({
        email: email.trim(),
        password,
        callbackURL: "/",
      });
      if (error) {
        toast.error(t.auth.failed, {
          description:
            typeof error.message === "string" && error.message
              ? error.message
              : t.auth.failedDesc,
        });
        return;
      }
      toast.success(t.auth.signedIn, { description: t.auth.signedInDesc });
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(t.auth.failed, {
        description: err instanceof Error ? err.message : t.auth.failedDesc,
      });
    } finally {
      setBusy(false);
    }
  }

  async function continueWithSso() {
    setSsoBusy(true);
    try {
      const { error } = await signIn.social({
        provider: "oidc",
        callbackURL: "/",
      });
      if (error) {
        toast.error(t.auth.failed, {
          description: ssoErrorMessage(error, t.auth.failedDesc),
        });
      }
    } catch (err) {
      toast.error(t.auth.failed, {
        description: err instanceof Error ? err.message : t.auth.failedDesc,
      });
    } finally {
      setSsoBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <section className="animate-rise text-center">
        <Logo className="mx-auto h-12 w-12" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          {t.auth.eyebrow}
        </p>
        <h1 className="font-display mt-1.5 text-3xl font-bold tracking-tight">
          {t.auth.heading}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t.auth.intro}
        </p>
      </section>

      <Card className="animate-rise" style={{ animationDelay: "80ms" }}>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">{t.auth.emailField}</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t.auth.passwordField}</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordPlaceholder}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <KeyRound />}
              {t.auth.submit}
            </Button>
          </form>

          {ssoEnabled && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                <span>SSO</span>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={ssoBusy}
                  onClick={() => void continueWithSso()}
                >
                  {ssoBusy && <Loader2 className="animate-spin" />}
                  {t.auth.sso}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t.auth.ssoHint}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
