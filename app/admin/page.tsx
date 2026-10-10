import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminConsole } from "@/components/admin-console";
import { LOCALE_COOKIE, getDict, resolveLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const t = getDict(resolveLocale(store.get(LOCALE_COOKIE)?.value));
  return { title: t.admin.heading };
}

export default function AdminPage() {
  return <AdminConsole />;
}
