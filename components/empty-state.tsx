import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-fade relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 h-48 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-primary-soft text-primary shadow-sm">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h3 className="font-display mt-5 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
