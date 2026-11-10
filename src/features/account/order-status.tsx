"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/client";
import type { OrderStatus } from "@/lib/api/types";

const VARIANT: Record<OrderStatus, "secondary" | "accent" | "success" | "warning" | "destructive" | "outline"> = {
  pending_payment: "warning",
  paid: "success",
  pending_confirmation: "warning",
  confirmed: "secondary",
  processing: "secondary",
  shipped: "accent",
  delivered: "success",
  cancelled: "destructive",
  refunded: "outline",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useT();
  return <Badge variant={VARIANT[status]}>{t(`order.status.${status}`)}</Badge>;
}

/** The happy-path steps shown in the customer timeline (cancelled/refunded are rendered separately). */
export const TIMELINE_STEPS = ["pending_confirmation", "confirmed", "processing", "shipped", "delivered"] as const;
