export interface AIInventoryReportBase {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    reportId?: string; // Tùy thuộc cấu trúc Entity nếu có Audit Log gốc
}

export interface AIInventoryReportStructuredResponse {
    success: boolean;
    data: any; // Dynamic JSON structure based on the structured AI response
    __httpStatusCode?: number;
}

export interface AIInventoryReportResponse {
    success: boolean;
    data: string; // The raw AI report string
    __httpStatusCode?: number;
}

export interface AIInventoryReportLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    reportId: string;
    aiResponse: string;
}

export interface AIInventoryReportLogListResponse {
    success: boolean;
    data: AIInventoryReportLog[];
    __httpStatusCode?: number;
}

export interface AIInventoryReportLogResponse {
    success: boolean;
    data: AIInventoryReportLog;
    __httpStatusCode?: number;
}
