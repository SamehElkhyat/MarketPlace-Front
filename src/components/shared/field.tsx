import { useId, type ReactElement, type ReactNode, cloneElement, isValidElement } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean;
  className?: string;
  /** A single form control; it receives `id`, `aria-invalid` and `aria-describedby` automatically. */
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }> | ReactNode;
}

/** Accessible label + control + error/hint wiring for react-hook-form fields. */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = isValidElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>(children)
    ? cloneElement(children, { id, "aria-invalid": error ? true : undefined, ...(describedBy ? { "aria-describedby": describedBy } : {}) })
    : children;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="ms-0.5 text-accent" aria-hidden>*</span> : null}
      </Label>
      {control}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
