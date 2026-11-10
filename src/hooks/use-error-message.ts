"use client";

import { useCallback } from "react";
import { useT } from "@/i18n/client";
import { ApiError } from "@/lib/api/errors";
import type { MessageKey } from "@/i18n/translate";

const KNOWN: Record<string, MessageKey> = {
  VALIDATION_ERROR: "errors.VALIDATION_ERROR",
  INVALID_CREDENTIALS: "errors.INVALID_CREDENTIALS",
  UNAUTHENTICATED: "errors.UNAUTHENTICATED",
  TOKEN_REUSE_DETECTED: "errors.TOKEN_REUSE_DETECTED",
  FORBIDDEN: "errors.FORBIDDEN",
  ACCOUNT_BANNED: "errors.ACCOUNT_BANNED",
  EMAIL_TAKEN: "errors.EMAIL_TAKEN",
  NOT_FOUND: "errors.NOT_FOUND",
  CONFLICT: "errors.CONFLICT",
  INSUFFICIENT_STOCK: "errors.INSUFFICIENT_STOCK",
  PRODUCT_UNAVAILABLE: "errors.PRODUCT_UNAVAILABLE",
  INVALID_TRANSITION: "errors.INVALID_TRANSITION",
  COUPON_INVALID: "errors.COUPON_INVALID",
  PRICE_CHANGED: "errors.PRICE_CHANGED",
  EMAIL_UNVERIFIED_FOR_ORDER: "errors.EMAIL_UNVERIFIED_FOR_ORDER",
  EMPTY_CART: "errors.EMPTY_CART",
  SHIPPING_UNAVAILABLE: "errors.SHIPPING_UNAVAILABLE",
  PAYMENT_METHOD_UNAVAILABLE: "errors.PAYMENT_METHOD_UNAVAILABLE",
  COD_LIMIT_EXCEEDED: "errors.COD_LIMIT_EXCEEDED",
  RATE_LIMITED: "errors.RATE_LIMITED",
  NETWORK: "errors.NETWORK",
};

/** Maps API error codes to friendly, localized messages (server `message` is for developers). */
export function useErrorMessage() {
  const t = useT();
  return useCallback(
    (error: unknown): string => {
      if (error instanceof ApiError) {
        const key = KNOWN[error.code];
        if (key) return t(key);
      }
      return t("errors.generic");
    },
    [t],
  );
}
