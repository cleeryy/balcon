import { Badge } from "@/components/ui/badge";
import { STATUS_COLOR, statusLabel, statusTone } from "@/components/status";

/**
 * Status pill built on the registry badge: official shape, theme tone,
 * pulsing dot. Everything user-facing comes from the `messages/` dictionaries.
 */
export function StatusBadge({
  status,
  active = true,
  title,
  label,
}: {
  status?: string | null;
  active?: boolean;
  title?: string;
  label?: string;
}) {
  const color =
    active && status ? (STATUS_COLOR[status] ?? "var(--muted-foreground)") : "var(--muted-foreground)";

  return (
    <Badge variant="outline" className={statusTone(status, active)} title={title}>
      <span
        className="status-dot"
        style={{ backgroundColor: color, color }}
        aria-hidden="true"
      />
      {label ?? statusLabel(status, active)}
    </Badge>
  );
}
