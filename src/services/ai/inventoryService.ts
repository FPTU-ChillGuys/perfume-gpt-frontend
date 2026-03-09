import { aiApiInstance } from "@/lib/api";
import type {
    AIInventoryReportResponse,
    AIInventoryReportStructuredResponse,
    AIInventoryReportLogListResponse,
    AIInventoryReportLogPagedResponse,
    AIInventoryReportLogResponse,
    InventoryReportJobCreatedResponse,
    InventoryReportJobResultResponse
} from "@/types/inventory";

class InventoryService {
    /**
     * Lấy báo cáo tồn kho cơ bản do AI tạo
     */
    async getInventoryReport(): Promise<AIInventoryReportResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report", {})
        );
    }

    /**
     * Lấy báo cáo tồn kho phân tích chuyên sâu bởi AI
     */
    async getAIInventoryReport(): Promise<AIInventoryReportResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report/ai", {})
        );
    }

    /**
     * Lấy báo cáo tồn kho cấu trúc (Structured JSON) từ AI
     */
    async getStructuredAIInventoryReport(): Promise<AIInventoryReportStructuredResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report/ai/structured", {})
        );
    }

    /**
     * Lấy danh sách lịch sử log báo cáo tồn kho AI
     */
    async getAllInventoryReportLogs(): Promise<AIInventoryReportLogListResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report/logs", {})
        );
    }

    /**
     * Lấy danh sách lịch sử log báo cáo tồn kho AI (paged)
     */
    async getInventoryReportLogsPaged(): Promise<AIInventoryReportLogPagedResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report/logs", {})
        );
    }

    /**
     * Lấy chi tiết một lịch sử log báo cáo tồn kho AI dựa theo ID
     */
    async getInventoryReportLogById(id: string): Promise<AIInventoryReportLogResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report/logs/{id}", {
                params: { path: { id } }
            })
        );
    }

    /**
     * Khởi tạo job để tạo báo cáo tồn kho bằng AI (background job)
     */
    async createInventoryReportJob(): Promise<InventoryReportJobCreatedResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report/ai/job", {})
        );
    }

    /**
     * Kiểm tra trạng thái / kết quả của job báo cáo tồn kho AI
     */
    async getInventoryReportJobResult(jobId: string): Promise<InventoryReportJobResultResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/inventory/report/ai/job/result/{jobId}" as any, {
                params: { path: { jobId } }
            })
        );
    }

    private handleResponse(response: any) {
        if (!response.data || !response.data.success) {
            throw new Error(
                response.data?.message || "Lỗi tương tác với AI Inventory Report API"
            );
        }
        return response.data;
    }
}

export const inventoryService = new InventoryService();
