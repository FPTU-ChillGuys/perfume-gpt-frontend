import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type StockResponse = components["schemas"]["StockResponse"];
export type BatchDetailResponse = components["schemas"]["BatchDetailResponse"];
export type InventorySummaryResponse =
  components["schemas"]["InventorySummaryResponse"];
export type PagedStockResponse =
  components["schemas"]["PagedResultOfStockResponse"];

export type InventoryStockQuery = {
  CategoryId?: number | null;
  BatchCode?: string;
  SKU?: string;
  DaysUntilExpiry?: number | null;
  StockStatus?: components["schemas"]["StockStatus"];
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
};

type BatchByVariantQuery = {
  VariantId: string;
  PageNumber?: number;
  PageSize?: number;
};

class InventoryService {
  private extractErrorMessage(error: any, fallback: string) {
    return error?.response?.data?.message || error?.message || fallback;
  }

  async getStock(query?: InventoryStockQuery): Promise<PagedStockResponse> {
    try {
      const response = await apiInstance.GET("/api/inventory/stock", {
        params: { query },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch stock");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching inventory stock:", error);
      throw new Error(this.extractErrorMessage(error, "Failed to fetch stock"));
    }
  }

  async getBatchesByVariant(variantId: string): Promise<BatchDetailResponse[]> {
    try {
      const query: BatchByVariantQuery = {
        VariantId: variantId,
        PageNumber: 1,
        PageSize: 100,
      };

      const response = await apiInstance.GET("/api/batches", {
        params: { query },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch batches");
      }

      return response.data.payload?.items || [];
    } catch (error: any) {
      console.error("Error fetching variant batches:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch batches"),
      );
    }
  }

  async getSummary(): Promise<InventorySummaryResponse | null> {
    try {
      const response = await apiInstance.GET("/api/inventory/summary");

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch summary");
      }

      return response.data.payload || null;
    } catch (error: any) {
      console.error("Error fetching inventory summary:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch summary"),
      );
    }
  }
}

export const inventoryService = new InventoryService();
