import { apiInstance } from "@/lib/api";
import type {
  CashFlowParams,
  InventoryLedgerParams,
  PaginatedCashFlowResponse,
  PaginatedLedgerResponse,
} from "@/types/ledger";

class LedgerService {
  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message;
    return fallback;
  }

  async getInventoryLedger(
    params?: InventoryLedgerParams,
  ): Promise<PaginatedLedgerResponse> {
    try {
      const response = await apiInstance.GET("/api/ledgers/inventory", {
        params: { query: params },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to fetch inventory ledger",
        );
      }

      return response.data.payload as unknown as PaginatedLedgerResponse;
    } catch (error: unknown) {
      console.error("Error fetching inventory ledger:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch inventory ledger"),
      );
    }
  }

  async getCashFlowLedger(
    params?: CashFlowParams,
  ): Promise<PaginatedCashFlowResponse> {
    try {
      const response = await apiInstance.GET("/api/ledgers/cash-flow", {
        params: { query: params },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to fetch cash flow ledger",
        );
      }

      return response.data.payload as unknown as PaginatedCashFlowResponse;
    } catch (error: unknown) {
      console.error("Error fetching cash flow ledger:", error);
      throw new Error(
        this.extractErrorMessage(error, "Failed to fetch cash flow ledger"),
      );
    }
  }
}

export const ledgerService = new LedgerService();
