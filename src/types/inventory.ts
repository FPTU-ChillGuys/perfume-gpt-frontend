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

// Response type aliases
export type AIInventoryReportStructuredResponse = ApiResponse<any>;
export type AIInventoryReportResponse = ApiResponse<string>;
export type AIInventoryReportLogListResponse = ApiResponse<AIInventoryReportLog[]>;
export type AIInventoryReportLogPagedData = InventoryLogPagedResult;
export type AIInventoryReportLogPagedResponse = ApiResponse<InventoryLogPagedResult>;
export type AIInventoryReportLogResponse = ApiResponse<AIInventoryReportLog>;
