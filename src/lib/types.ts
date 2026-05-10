// ─────────────────────────────────────────────────────────────────────────────
// memoir. — Shared Types
// TypeScript interfaces aligned with backend API Contract (camelCase)
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums (mirror backend DB enums) ──────────────────────────────────────────

export type UserRole = "platform_admin" | "studio_owner";
export type BillingPeriod = "MONTHLY" | "YEARLY";
export type SubscriptionStatus =
  | "ACTIVE"
  | "PENDING_PAYMENT"
  | "EXPIRED"
  | "CANCELLED";
export type TxStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";
export type PaymentMethod = "PG" | "CASH" | "STATIC_QRIS";
export type TransactionType = "NORMAL" | "EVENT";
export type ElementType = "PHOTO_SLOT" | "IMAGE" | "TEXT";
export type AssetFolder = "backgrounds" | "elements";

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  revenueThisMonth: number;
  paidTransactionsToday: number;
  activeKiosks: number;
  maxKiosks: number;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  pendingUpgrade: Subscription | null;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

// ── Subscription ─────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  maxKiosks: number;
  priceMonthly: number;
  priceYearly: number;
  /** Only present in admin response; owner endpoint only returns active plans */
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  pricePaid: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  previousPlanId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionResponse {
  subscription: Subscription | null;
  subscriptionStatus: SubscriptionStatus;
  /** PENDING_PAYMENT subscription if an upgrade is in-flight; null otherwise */
  pendingUpgrade: Subscription | null;
}

export interface CreateSubscriptionRequest {
  planId: string;
  billingPeriod: BillingPeriod;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  invoiceNumber: string;
  amount: number;
  billingPeriod: BillingPeriod;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  paymentMethod: PaymentMethod | null;
  qrString: string | null;
  orderId: string;
  periodStart: string;
  periodEnd: string;
  paymentExpiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateSubscriptionResponse {
  data: {
    subscription: Subscription;
    invoice: SubscriptionInvoice;
  };
}

export interface CheckPaymentResponse {
  data: {
    status: "PAID" | "PENDING" | "FAILED" | "EXPIRED";
    subscription: Subscription | null;
  };
}

// ── Kiosk ─────────────────────────────────────────────────────────────────────

export interface Kiosk {
  id: string;
  /** Only present in detail responses, not in list */
  ownerId?: string;
  name: string;
  /** Excluded from list response for security */
  pairingCode?: string | null;
  /** null if kiosk has not been paired or was re-paired. Always present in response (can be null) */
  pairedAt: string | null;
  priceBaseSession: number;
  pricePerExtraPrint: number;
  priceDigitalCopy: number;
  /** Not returned by list endpoint */
  createdAt?: string;
  /** Not returned by list endpoint */
  updatedAt?: string;
}

// ── Transaction ──────────────────────────────────────────────────────────────

/** List response shape — enriched kioskName, no price breakdown */
export interface Transaction {
  id: string;
  orderId: string;
  transactionType: TransactionType;
  kioskId: string;
  kioskName: string;
  status: TxStatus;
  paymentMethod: PaymentMethod;
  printQty: number;
  hasDigitalCopy: boolean;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
}

/** Detail response shape — full price breakdown + template info */
export interface TransactionDetail {
  id: string;
  orderId: string;
  transactionType: TransactionType;
  status: TxStatus;
  paymentMethod: PaymentMethod;
  kioskId: string;
  kioskName: string;
  templateId: string;
  templateName: string;
  printQty: number;
  hasDigitalCopy: boolean;
  appliedBasePrice: number;
  appliedExtraPrintPrice: number;
  appliedDigitalCopyPrice: number;
  totalAmount: number;
  qrString: string | null;
  paymentExpiresAt: string | null;
  providerReferenceId: string | null;
  failedReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

// ── Paginated Meta ───────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}
// ── Template ─────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateElement {
  id: string;
  templateId: string;
  elementType: ElementType;
  sequence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties: Record<string, unknown>;
  createdAt: string;
}

export interface TemplateWithElements {
  template: Template;
  elements: TemplateElement[];
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  height: number;
  backgroundUrl: string;
  width?: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  height?: number;
  backgroundUrl?: string;
  width?: number;
}

export interface CreateElementRequest {
  elementType: ElementType;
  sequence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties: Record<string, unknown>;
}

export interface UpdateElementRequest {
  elementType?: ElementType;
  sequence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  properties?: Record<string, unknown>;
}

export interface AssetUploadResponse {
  url: string;
}

// ── Payment Config ────────────────────────────────────────────────────────────

export type PaymentConfigStatus =
  | "PENDING_VALIDATION"
  | "ACTIVE"
  | "INVALID"
  | "DISABLED";

export type PaymentProviderCode = "DOKU" | "MIDTRANS" | "XENDIT";

export interface PaymentConfig {
  id: string;
  userId: string;
  providerCode: PaymentProviderCode;
  label: string;
  environment: "PRODUCTION" | "SANDBOX";
  isDefault: boolean;
  status: PaymentConfigStatus;
  credentialsLastFour: string | null;
  webhookPathToken: string;
  lastValidatedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}
