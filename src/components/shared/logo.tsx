import { cn } from "@/lib/utils";

/** Wordmark — wide-tracked light serif; the brand is carried by type, not by an icon. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-heading text-lg font-light tracking-[0.32em] text-foreground uppercase select-none", className)}
      translate="no"
    >
      Atelier
    </span>
  );
}
