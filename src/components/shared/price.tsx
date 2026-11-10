"use client";

import { useLocale } from "@/i18n/client";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PriceProps {
  /** Integer piasters. */
  amount: number;
  compareAt?: number | undefined;
  className?: string;
  /** Show "from <price>" semantics: caller renders the prefix. */
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "text-sm", md: "text-base", lg: "text-lg" } as const;

/** Formatted price with an optional struck-through "was" price. Numerals follow the active language. */
export function Price({ amount, compareAt, className, size = "md" }: PriceProps) {
  const locale = useLocale();
  return (
    <span className={cn("inline-flex items-baseline gap-2 tabular-nums", sizes[size], className)}>
      <span className={cn(compareAt && "text-foreground")}>{formatMoney(amount, locale)}</span>
      {compareAt && compareAt > amount ? (
        <s className="text-sm text-muted-foreground">{formatMoney(compareAt, locale)}</s>
      ) : null}
    </span>
  );
}

export function Money({ amount, className }: { amount: number; className?: string }) {
  const locale = useLocale();
  return <span className={cn("tabular-nums", className)}>{formatMoney(amount, locale)}</span>;
}
