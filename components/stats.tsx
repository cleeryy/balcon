import type { LucideIcon } from "lucide-react";
import { CircleAlert, RefreshCw, ScanEye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/motion/number-ticker";
import { strings as t } from "@/lib/strings";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  hint: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}

export function Stats({
  total,
  changed,
  errors,
  loading,
}: {
  total: number;
  changed: number;
  errors: number;
  loading: boolean;
}) {
  const stats: Stat[] = [
    {
      label: t.dashboard.stats.total,
      hint: t.dashboard.stats.totalHint,
      value: total,
      icon: ScanEye,
      tone: "text-primary",
    },
    {
      label: t.dashboard.stats.changed,
      hint: t.dashboard.stats.changedHint,
      value: changed,
      icon: RefreshCw,
      tone: "text-warning",
    },
    {
      label: t.dashboard.stats.errors,
      hint: t.dashboard.stats.errorsHint,
      value: errors,
      icon: CircleAlert,
      tone: "text-destructive",
    },
  ];

  return (
    <Card className="animate-rise grain overflow-hidden" style={{ animationDelay: "80ms" }}>
      <div className="grid grid-cols-3 divide-x divide-border">
        {stats.map((s) => (
          <div key={s.label} className="px-3 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <s.icon className={cn("h-3.5 w-3.5 shrink-0", s.tone)} strokeWidth={2.25} />
              <span className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground sm:text-xs sm:tracking-[0.1em]">
                {s.label}
              </span>
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-14 sm:h-10 sm:w-16" />
            ) : (
              <p className={cn("font-display mt-2 text-2xl font-bold leading-none sm:text-4xl", s.tone)}>
                <NumberTicker value={s.value} startOnView={false} duration={0.7} />
              </p>
            )}
            <p className="mt-1.5 hidden text-xs text-muted-foreground sm:block">{s.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
