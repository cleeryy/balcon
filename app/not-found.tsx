import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NotFoundGlitch } from "@/components/motion/not-found/glitch";
import { LOCALE_COOKIE, getDict, resolveLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const t = getDict(resolveLocale(store.get(LOCALE_COOKIE)?.value));
  return { title: t.detail.notFound.title };
}

export default async function NotFound() {
  const store = await cookies();
  const t = getDict(resolveLocale(store.get(LOCALE_COOKIE)?.value));

  return (
    <NotFoundGlitch
      code="404"
      title={t.detail.notFound.title}
      description={t.detail.notFound.description}
      homeHref="/"
      homeLabel={t.detail.notFound.goBack}
      browseHref="/"
      browseLabel={t.detail.notFound.goBack}
    />
  );
}
