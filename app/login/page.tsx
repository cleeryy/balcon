import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LoginForm } from "@/components/login-form";
import { LOCALE_COOKIE, getDict, resolveLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const t = getDict(resolveLocale(store.get(LOCALE_COOKIE)?.value));
  return { title: t.auth.eyebrow };
}

export default function LoginPage() {
  return <LoginForm />;
}
