import { apiInstance } from "@/lib/api";
import type {
  InventoryLedgerParams,
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
}

export const ledgerService = new LedgerService();
