import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Primary action — every empty state offers a way forward. */
  action?: ReactNode;
  className?: string;
}

/** Designed empty states (empty cart, no results, no orders…): a title, a sentence, and a button. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center", className)}
      role="status"
    >
      {Icon ? <Icon className="size-8 text-muted-foreground" strokeWidth={1.25} aria-hidden /> : null}
      <h2 className="text-xl">{title}</h2>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
