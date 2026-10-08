import { cn } from "@/lib/utils";

/** Marque balcon : un balcon vu de face, sur une plaque dégradée. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="balcon"
      className={cn("h-8 w-8", className)}
    >
      <defs>
        <linearGradient id="balcon-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="color-mix(in oklab, var(--primary) 55%, #12b886)" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="url(#balcon-plate)" />
      <g
        stroke="var(--primary-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.95"
      >
        <path d="M7.5 14.5h17" />
        <path d="M11 14.5v8" />
        <path d="M16 14.5v8" />
        <path d="M21 14.5v8" />
        <path d="M8.5 22.5h15" />
        <path d="M10.5 11.5c1.7-1.4 3.6-2.1 5.5-2.1s3.8.7 5.5 2.1" />
      </g>
    </svg>
  );
}
