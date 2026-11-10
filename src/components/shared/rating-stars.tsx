import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  value: number;
  /** Pre-formatted (localized numerals) review count. */
  count?: string;
  size?: "sm" | "md";
  className?: string;
  label: string;
}

/** Read-only star rating with a screen-reader label (e.g. "4.5 out of 5"). */
export function RatingStars({ value, count, size = "sm", className, label }: RatingStarsProps) {
  const dimension = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} role="img" aria-label={label}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            strokeWidth={1.5}
            className={cn(dimension, i <= Math.round(value) ? "fill-accent text-accent" : "text-border")}
          />
        ))}
      </span>
      {count !== undefined ? (
        <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
          ({count})
        </span>
      ) : null}
    </span>
  );
}
