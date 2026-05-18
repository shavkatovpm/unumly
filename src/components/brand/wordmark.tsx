import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  showDot = true,
}: {
  className?: string;
  showDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-sans text-foreground",
        className
      )}
    >
      <span className="font-medium tracking-[-0.02em]">unumly</span>
      {showDot && (
        <span
          aria-hidden
          className="relative inline-block size-1.5 translate-y-[-0.15em] rounded-full bg-accent"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
        </span>
      )}
    </span>
  );
}
