import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type StockAdjustmentReason =
  components["schemas"]["StockAdjustmentReason"];
export type StockAdjustmentStatus =
  components["schemas"]["StockAdjustmentStatus"];
export type StockAdjustmentListItem =
  components["schemas"]["StockAdjustmentListItem"];
export type StockAdjustmentResponse =
  components["schemas"]["StockAdjustmentResponse"];
export type StockAdjustmentDetailResponse =
  components["schemas"]["StockAdjustmentDetailResponse"];
export type PagedStockAdjustmentList =
  components["schemas"]["PagedResultOfStockAdjustmentListItem"];

export type StockAdjustmentQuery = {
  Reason?: StockAdjustmentReason;
  Status?: StockAdjustmentStatus;
  FromDate?: string;
  ToDate?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
};

export type CreateStockAdjustmentRequest =
  components["schemas"]["CreateStockAdjustmentRequest"];
export type VerifyStockAdjustmentRequest =
  components["schemas"]["VerifyStockAdjustmentRequest"];
export type UpdateStockAdjustmentStatusRequest =
  components["schemas"]["UpdateStockAdjustmentStatusRequest"];

class StockAdjustmentService {
  private extractErrorMessage(error: any, fallback: string) {
    return error?.response?.data?.message || error?.message || fallback;
  }

  async getAdjustments(
    query?: StockAdjustmentQuery,
  ): Promise<PagedStockAdjustmentList> {
    try {
      const response = await apiInstance.GET("/api/stockadjustments", {
        params: { query },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to fetch stock adjustments",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching stock adjustments:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch stock adjustments"),
      );
    }
  }

  async createAdjustment(
    payload: CreateStockAdjustmentRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/stockadjustments", {
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create adjustment",
        );
      }

      return (
        response.data.message ||
        response.data.payload ||
        "Tạo yêu cầu thành công"
      );
    } catch (error: any) {
      console.error("Error creating stock adjustment:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to create adjustment"),
      );
    }
  }

  async getAdjustmentById(
    adjustmentId: string,
  ): Promise<StockAdjustmentResponse | null> {
    try {
      const response = await apiInstance.GET("/api/stockadjustments/{id}", {
        params: { path: { id: adjustmentId } },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch adjustment detail",
        );
      }

      return response.data.payload || null;
    } catch (error: any) {
      console.error("Error fetching adjustment detail:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch adjustment detail"),
      );
    }
  }

  async verifyAdjustment(
    adjustmentId: string,
    payload: VerifyStockAdjustmentRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/stockadjustments/{adjustmentId}/verify",
        {
          params: { path: { adjustmentId } },
          body: payload,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to verify adjustment",
        );
      }

      return (
        response.data.message ||
        response.data.payload ||
        "Duyệt yêu cầu thành công"
      );
    } catch (error: any) {
      console.error("Error verifying adjustment:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to verify adjustment"),
      );
    }
  }

  async updateAdjustmentStatus(
    adjustmentId: string,
    payload: UpdateStockAdjustmentStatusRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/stockadjustments/{id}/status",
        {
          params: { path: { id: adjustmentId } },
          body: payload,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to update adjustment status",
        );
      }

      return (
        response.data.message ||
        response.data.payload ||
        "Cập nhật trạng thái thành công"
      );
    } catch (error: any) {
      console.error("Error updating stock adjustment status:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to update adjustment status"),
      );
    }
  }
}

export const stockAdjustmentService = new StockAdjustmentService();
