"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDict } from "@/components/locale-provider";
import { isAdminSession, signOut, useSession } from "@/lib/auth-client";

/**
 * Bloc session dans l'en-tête : discret pendant le chargement
 * (jamais de flash du lien Admin pour les non-admins), puis soit le
 * bouton de connexion, soit l'utilisateur + rôle + déconnexion.
 */
export function SessionMenu() {
  const t = useDict();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) return <span className="w-8" aria-hidden="true" />;
  if (!session?.user) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/login">{t.header.signIn}</Link>
      </Button>
    );
  }

  const adminView = isAdminSession(session);
  const label = session.user.name || session.user.email;

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
        onError: () => {
          toast.error(t.toast.unknownError);
        },
      },
    });
  }

  return (
    <span className="flex items-center gap-1.5">
      {adminView && (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ShieldCheck />
            {t.header.admin}
          </Link>
        </Button>
      )}
      <span
        className="hidden max-w-40 truncate text-sm text-muted-foreground md:inline"
        title={session.user.email}
      >
        {label}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => void handleSignOut()}
        aria-label={t.header.signOutLabel}
        title={t.header.signOut}
      >
        <LogOut />
      </Button>
    </span>
  );
}
