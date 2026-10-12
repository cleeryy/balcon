"use client";

import { AnimatedBadge, type AnimatedBadgeStatus } from "@/components/motion/animated-badge";
import { statusLabel } from "@/components/status";

function toAnimatedStatus(status?: string | null, active = true): AnimatedBadgeStatus {
  if (!active || !status) return "neutral";
  switch (status) {
    case "OK":
      return "success";
    case "CHANGED":
      return "warning";
    case "ERROR":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Status pill built on the beui animated badge: the icon and label roll
 * over with a blur when the status changes. Everything user-facing still
 * comes from the `messages/` dictionaries.
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
  return (
    <AnimatedBadge status={toAnimatedStatus(status, active)} size="sm" title={title}>
      {label ?? statusLabel(status, active)}
    </AnimatedBadge>
  );
}
