import type { ApiResponse, BaseEntity } from "./common";

export type { ApiResponse, BaseEntity };

export interface AIInventoryReportBase extends BaseEntity {
    reportId?: string;
}

export interface AIInventoryReportLog extends BaseEntity {
    inventoryLog: string;
}

/** Actual paged shape returned by /inventory/report/logs */
export interface InventoryLogPagedResult {
    items: AIInventoryReportLog[];
    totalCount: number;
}

export interface InventoryReportJobCreated {
    jobId: string;
    expirationTime: string;
}

export type InventoryReportJobStatus = 'pending' | 'completed' | 'failed';

export interface InventoryReportJobResult {
    status: InventoryReportJobStatus;
    data?: string;
    error?: string;
}

// Response type aliases
export type AIInventoryReportStructuredResponse = ApiResponse<any>;
export type AIInventoryReportResponse = ApiResponse<string>;
export type AIInventoryReportLogListResponse = ApiResponse<AIInventoryReportLog[]>;
export type AIInventoryReportLogPagedData = InventoryLogPagedResult;
export type AIInventoryReportLogPagedResponse = ApiResponse<InventoryLogPagedResult>;
export type AIInventoryReportLogResponse = ApiResponse<AIInventoryReportLog>;
export type InventoryReportJobCreatedResponse = ApiResponse<InventoryReportJobCreated>;
export type InventoryReportJobResultResponse = ApiResponse<InventoryReportJobResult>;

// Restock Types
export interface RestockAIVariant {
    id: string;
    sku: string;
    volumeMl: number;
    type: string;
    basePrice: number;
    status: string;
    concentrationName: string;
    totalQuantity: number;
    reservedQuantity: number;
    suggestedRestockQuantity: number;
}

export interface RestockImportMetadata {
    supplierId?: number | null;
    expectedArrivalDate?: string;
}

export interface RestockAIPredictionData {
    variants: RestockAIVariant[];
    importTicketMetadata?: RestockImportMetadata;
}

export interface RestockLog extends BaseEntity {
    inventoryLog: string;
    type: string; // usually 'RESTOCK'
}

export interface RestockLogPagedResult {
    items: RestockLog[];
    totalCount: number;
}

export type RestockAIPredictionResponse = ApiResponse<string>; // Data is JSON string
export type RestockLogPagedResponse = ApiResponse<RestockLogPagedResult>;

// Job Responses
export type RestockJobCreatedResponse = ApiResponse<InventoryReportJobCreated>;
export type RestockJobResultResponse = ApiResponse<InventoryReportJobResult>;
