/**
 * API data shapes (mirrors the Express backend). All money values are INTEGER PIASTERS (1 EGP = 100).
 * Keep in sync with `backend/src/modules/**`.
 */

export interface Localized {
  ar: string;
  en: string;
}

export type UserRole = "customer" | "admin" | "demo_admin";

export interface OptionLabel {
  key: string;
  label: Localized;
  value: Localized;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  locale: "ar" | "en";
  createdAt: string;
}

export interface Address {
  _id: string;
  label?: string;
  fullName: string;
  phone: string;
  governorate: string;
  city: string;
  street: string;
  notes?: string;
  isDefault: boolean;
}

export interface Profile {
  user: User;
  addresses: Address[];
  wishlist: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

// ── Catalogue ────────────────────────────────────────────────────────────────
export interface CategoryNode {
  id: string;
  name: Localized;
  slug: string;
  image?: string;
  level: number;
  children: CategoryNode[];
}

export interface AttributeValue {
  value: string;
  label?: Localized;
  swatch?: string;
}

export interface AttributeDef {
  key: string;
  label: Localized;
  type: "select" | "color" | "text" | "number";
  values: AttributeValue[];
  filterable: boolean;
  variantOption: boolean;
}

export interface Breadcrumb {
  id: string;
  name: Localized;
  slug: string;
}

export interface CategoryDetails {
  category: { _id: string; name: Localized; slug: string; image?: string; level: number };
  breadcrumbs: Breadcrumb[];
  children: { id: string; name: Localized; slug: string; image?: string }[];
  attributes: AttributeDef[];
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description: Localized;
}

export interface Collection {
  _id: string;
  title: Localized;
  slug: string;
  description: Localized;
  image?: string;
  sortOrder: number;
}

export interface ProductCardData {
  id: string;
  title: Localized;
  slug: string;
  images: { url: string; alt?: string }[];
  brandId?: string;
  minPrice: number;
  maxPrice: number;
  ratingAvg: number;
  ratingCount: number;
  options: { key: string; values: string[] }[];
  inStock: boolean;
  onSale: boolean;
}

export interface FacetAttribute {
  key: string;
  label: Localized;
  type: AttributeDef["type"];
  values: { value: string; label?: Localized; swatch?: string; count: number }[];
}

export interface ProductListResponse {
  items: ProductCardData[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: {
    brands: { id: string; slug: string; name: string; count: number }[];
    attributes: FacetAttribute[];
    price: { min: number; max: number } | null;
  };
}

export interface Variant {
  _id: string;
  sku: string;
  optionValues: Record<string, string>;
  price: number;
  compareAtPrice?: number;
  stock: number;
}

export interface ProductDetailsResponse {
  product: {
    _id: string;
    title: Localized;
    slug: string;
    description: Localized;
    categoryId: string;
    brandId?: string;
    images: { url: string; alt?: string; publicId?: string }[];
    specs: Record<string, string>;
    options: { key: string; values: string[] }[];
    variants: Variant[];
    minPrice: number;
    maxPrice: number;
    ratingAvg: number;
    ratingCount: number;
    soldCount: number;
    updatedAt: string;
  };
  brand: Brand | null;
  breadcrumbs: Breadcrumb[];
  attributes: AttributeDef[];
  related: ProductCardData[];
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  author: string;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Cart / checkout / orders ─────────────────────────────────────────────────
export type CartWarning = "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "PRICE_CHANGED";

export interface CartLine {
  sku: string;
  qty: number;
  available: boolean;
  productId?: string;
  slug?: string;
  title?: Localized;
  image?: string;
  optionValues?: Record<string, string>;
  options?: OptionLabel[];
  unitPrice: number;
  compareAtPrice?: number;
  stock: number;
  previousPrice?: number;
  lineTotal: number;
  warnings: CartWarning[];
}

export interface CartView {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  hasBlockingIssues: boolean;
}

export type PaymentMethod = "cod" | "card" | "wallet" | "fawry";

export interface PaymentMethodInfo {
  method: PaymentMethod;
  provider: string;
  enabled: boolean;
  comingSoon: boolean;
}

export interface ShippingZone {
  governorate: string;
  name: Localized;
  fee: number;
  estimatedDays: { min: number; max: number };
}

export interface Quote {
  cart: CartView;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  shippingEstimate: { min: number; max: number } | null;
  shippingKnown: boolean;
  coupon: { code: string; error?: { reason?: string } } | null;
  codMaxAmount: number;
  codAvailable: boolean;
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "pending_confirmation"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  productId: string;
  sku: string;
  title: Localized;
  image?: string;
  optionValues: Record<string, string>;
  options: OptionLabel[];
  unitPrice: number;
  qty: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: "unpaid" | "paid" | "refunded" | "failed";
  items: OrderItem[];
  shippingAddress: Omit<Address, "_id" | "isDefault" | "label">;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  customerNote?: string;
  cancelReason?: string;
  statusHistory: { status: OrderStatus; at: string; actor: "customer" | "admin" | "system"; note?: string }[];
  /** Transitions the current actor may trigger (server-enforced). */
  allowedActions: OrderStatus[];
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; email: string };
}

export interface PlaceOrderResponse {
  order: Order;
  payment: { providerTxnId: string; clientSecret?: string; redirectUrl?: string; reference?: string } | null;
  replayed: boolean;
}

// ── Admin ────────────────────────────────────────────────────────────────────
export interface DashboardData {
  today: { revenue: number; orders: number };
  month: { revenue: number; orders: number; averageOrderValue: number };
  salesByDay: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string; title: Localized; image?: string; qty: number; revenue: number }[];
  topCategories: { categoryId: string; name: Localized; qty: number; revenue: number }[];
  orderStatusCounts: Partial<Record<OrderStatus, number>>;
  lowStock: { sku: string; stock: number; productId: string; title: Localized }[];
  lowStockThreshold: number;
}

export interface AdminProductRow {
  _id: string;
  title: Localized;
  slug: string;
  images: { url: string }[];
  status: "draft" | "published";
  minPrice: number;
  maxPrice: number;
  variants: { sku: string; stock: number }[];
  soldCount: number;
  updatedAt: string;
}

export interface AdminCategory {
  _id: string;
  name: Localized;
  slug: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  attributes: AttributeDef[];
}

export interface Coupon {
  _id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  startsAt?: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  status: "active" | "banned";
  emailVerified: boolean;
  createdAt: string;
  orders: number;
  totalSpent: number;
}

export interface InventoryLog {
  _id: string;
  sku: string;
  delta: number;
  reason: string;
  note?: string;
  orderId?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  actorId?: { name: string; email: string } | string;
}
