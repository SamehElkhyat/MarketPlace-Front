/** Error codes returned by the API (`error.code`). The UI maps them to localized messages. */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "TOKEN_REUSE_DETECTED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "ACCOUNT_BANNED"
  | "EMAIL_TAKEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "PRODUCT_UNAVAILABLE"
  | "INVALID_TRANSITION"
  | "COUPON_INVALID"
  | "PRICE_CHANGED"
  | "EMAIL_UNVERIFIED_FOR_ORDER"
  | "EMPTY_CART"
  | "SHIPPING_UNAVAILABLE"
  | "PAYMENT_METHOD_UNAVAILABLE"
  | "COD_LIMIT_EXCEEDED"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "NETWORK";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field-level validation messages, keyed by dotted path (`variants.0.sku`). */
  get fieldErrors(): Record<string, string> {
    if (this.code !== "VALIDATION_ERROR" || !Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as { path: string; message: string }[]).map((d) => [d.path, d.message]),
    );
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
