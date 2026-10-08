import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export type CheckStatus = "OK" | "CHANGED" | "ERROR" | "SKIPPED";

export const STATUS_LABEL: Record<string, string> = {
  OK: "inchangé",
  CHANGED: "modifié",
  ERROR: "erreur",
  SKIPPED: "ignoré",
};

export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  OK: "success",
  CHANGED: "warning",
  ERROR: "destructive",
  SKIPPED: "muted",
};

/** Variante de badge adaptée au statut, et à l'état actif/pause. */
export function statusVariant(status?: string | null, active = true): BadgeVariant {
  if (!active || !status) return "muted";
  return STATUS_VARIANT[status] ?? "muted";
}

/** Couleur du point de statut (variable de thème). */
export const STATUS_COLOR: Record<string, string> = {
  OK: "var(--success)",
  CHANGED: "var(--warning)",
  ERROR: "var(--destructive)",
  SKIPPED: "var(--muted-foreground)",
};

export function statusLabel(status?: string | null) {
  if (!status) return "jamais vérifié";
  return STATUS_LABEL[status] ?? status.toLowerCase();
}

/** « il y a 3 min », « hier », « 12 mars à 14:05 » — basé sur le navigateur. */
export function relativeTime(iso?: string | null): string {
  if (!iso) return "jamais";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "jamais";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 45) return "à l'instant";
  const min = Math.round(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const day = Math.round(h / 24);
  if (day === 1) return "hier";
  if (day < 7) return `il y a ${day} jours`;
  return new Date(then).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** « dans 12 min », « dans 3 h » — pour les prochains checks. */
export function untilTime(iso?: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = then - Date.now();
  if (diff <= 0) return "à tout moment";
  const min = Math.round(diff / 60000);
  if (min < 60) return `dans ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `dans ${h} h`;
  return `dans ${Math.round(h / 24)} j`;
}

/** Message de check traduit en français lisible (le backend renvoie de l'anglais). */
export function logMessage(message?: string | null): string {
  if (!message) return "—";
  const known: Record<string, string> = {
    "no change": "aucun changement",
    "watch not found": "surveillance introuvable",
    "watch paused": "surveillance en pause",
    "fetch failed": "page inaccessible depuis le serveur",
    "fetcher error": "erreur du service de récupération",
    "initial snapshot": "premier snapshot enregistré",
  };
  const change = message.match(/^content changed (\S+) -> (\S+)$/);
  if (change) return `contenu modifié (${change[1]} → ${change[2]})`;
  return known[message] ?? message;
}

export function absoluteTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
