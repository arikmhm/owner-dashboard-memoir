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
  | "CANCELLED"
  | "GRACE_PERIOD";
export type TxStatus = "PENDING" | "PAID" | "FAILED";
export type PaymentMethod = "PG" | "CASH" | "STATIC_QRIS";
export type MutationType = "CREDIT" | "DEBIT";
export type MutationCategory =
  | "TRANSACTION_INCOME"
  | "WITHDRAWAL"
  | "ADJUSTMENT";
export type WithdrawalStatus = "PENDING" | "PROCESSED" | "REJECTED";
export type ElementType = "photo_slot" | "image" | "text" | "shape";
export type AssetFolder = "backgrounds" | "overlays" | "elements";

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  walletBalance: number;
  revenueThisMonth: number;
  paidTransactionsToday: number;
  activeKiosks: number;
  maxKiosks: number;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  gracePeriodDaysRemaining: number;
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
  gracePeriodDaysRemaining: number;
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
  userId: string;
  amount: number;
  billingPeriod: BillingPeriod;
  status: "PENDING" | "PAID" | "FAILED";
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
    status: "PAID" | "PENDING" | "FAILED";
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
  /** Not returned by list endpoint */
  pairedAt?: string | null;
  isActive: boolean;
  priceBaseSession: number;
  pricePerExtraPrint: number;
  priceDigitalCopy: number;
  /** Not returned by list endpoint */
  createdAt?: string;
  /** Not returned by list endpoint */
  updatedAt?: string;
}

// ── Transaction ──────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  ownerId: string;
  kioskId: string;
  templateId: string;
  orderId: string;
  status: TxStatus;
  paymentMethod: PaymentMethod;
  qrString: string | null;
  paymentExpiresAt: string | null;
  printQty: number;
  hasDigitalCopy: boolean;
  appliedBasePrice: number;
  appliedExtraPrintPrice: number;
  appliedDigitalCopyPrice: number;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
}

// ── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletMutation {
  id: string;
  userId: string;
  transactionRefId: string | null;
  withdrawalRefId: string | null;
  type: MutationType;
  category: MutationCategory;
  amount: number;
  currentBalanceSnapshot: number;
  description: string | null;
  createdAt: string;
}

export interface WalletResponse {
  balance: number;
  mutations: WalletMutation[];
}

// ── Withdrawal ───────────────────────────────────────────────────────────────

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  status: WithdrawalStatus;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  processedBy: string | null;
  processedAt: string | null;
  rejectionNote: string | null;
  walletMutationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}

export interface CreateWithdrawalResponse {
  withdrawal: Withdrawal;
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
  ownerId: string;
  name: string;
  width: number;
  height: number;
  backgroundUrl: string;
  overlayUrl: string | null;
  overridePriceBase: number | null;
  overridePriceExtraPrint: number | null;
  overridePriceDigitalCopy: number | null;
  isActive: boolean;
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
  opacity: number;
  properties: Record<string, unknown>;
  createdAt: string;
}

export interface TemplateWithElements {
  template: Template;
  elements: TemplateElement[];
}

export interface CreateTemplateRequest {
  name: string;
  width: number;
  height: number;
  backgroundUrl: string;
  overlayUrl?: string | null;
  overridePriceBase?: number | null;
  overridePriceExtraPrint?: number | null;
  overridePriceDigitalCopy?: number | null;
  isActive?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  backgroundUrl?: string;
  overlayUrl?: string | null;
  overridePriceBase?: number | null;
  overridePriceExtraPrint?: number | null;
  overridePriceDigitalCopy?: number | null;
  isActive?: boolean;
}

export interface CreateElementRequest {
  elementType: ElementType;
  sequence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  properties: Record<string, unknown>;
}

export interface UpdateElementRequest {
  sequence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  properties?: Record<string, unknown>;
}

export interface AssetUploadResponse {
  url: string;
}
