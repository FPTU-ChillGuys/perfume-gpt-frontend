export type InventoryLedgerType = "Import" | "Sales" | "Adjustment";

export interface InventoryLedgerEntry {
  id: string;
  createdAt: string;
  variantId: string;
  batchId: string;
  quantityChange: number;
  balanceAfter: number;
  type: InventoryLedgerType;
  referenceId: string | null;
  description: string | null;
  actorId: string | null;
}

export interface InventoryLedgerParams {
  FromDate?: string;
  ToDate?: string;
  VariantId?: string;
  BatchId?: string;
  Type?: InventoryLedgerType;
  ReferenceId?: string;
  ActorId?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
}

export interface PaginatedLedgerResponse {
  items: InventoryLedgerEntry[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/* ────────────── Cash Flow Ledger ────────────── */

export type CashFlowType = "In" | "Out";

export type CashFlowCategory =
  | "OrderPayment"
  | "Refund"
  | "ShippingFeeToGHN"
  | "SupplierPayment";

export interface CashFlowEntry {
  id: string;
  transactionDate: string;
  amount: number;
  flowType: CashFlowType;
  category: CashFlowCategory;
  referenceId: string | null;
  referenceCode: string | null;
  description: string | null;
}

export interface CashFlowParams {
  FromDate?: string;
  ToDate?: string;
  FlowType?: CashFlowType;
  Category?: CashFlowCategory;
  ReferenceId?: string;
  ReferenceCode?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
}

export interface PaginatedCashFlowResponse {
  items: CashFlowEntry[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
