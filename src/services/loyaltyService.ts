import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type LoyaltyPointResponse =
  components["schemas"]["LoyaltyTransactionTotalsResponse"];

export type LoyaltyHistoryItem =
  components["schemas"]["LoyaltyTransactionHistoryItemResponse"];

export type LoyaltyTransactionType =
  components["schemas"]["LoyaltyTransactionType"];

class LoyaltyService {
  async getMyBalance(): Promise<LoyaltyPointResponse> {
    const response = await apiInstance.GET("/api/loyaltytransactions/me/total");
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to load loyalty balance",
      );
    }
    return (response.data.payload as LoyaltyPointResponse) ?? {};
  }

  async addPoints(
    userId: string,
    points: number,
    description?: string,
  ): Promise<void> {
    const response = await apiInstance.POST(
      "/api/loyaltytransactions/{userId}/manual-change",
      {
        params: { path: { userId } },
        body: {
          transactionType: "Earn",
          points,
          reason: description || "Cộng điểm thủ công",
        },
      },
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to add points");
    }
  }

  async redeemPoints(
    userId: string,
    points: number,
    description?: string,
  ): Promise<void> {
    const response = await apiInstance.POST(
      "/api/loyaltytransactions/{userId}/manual-change",
      {
        params: { path: { userId } },
        body: {
          transactionType: "Spend",
          points,
          reason: description || "Trừ điểm thủ công",
        },
      },
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to redeem points");
    }
  }

  async getMyHistory(
    page = 1,
    pageSize = 10,
    transactionType?: LoyaltyTransactionType,
  ): Promise<{ items: LoyaltyHistoryItem[]; totalCount: number }> {
    const response = await apiInstance.GET(
      "/api/loyaltytransactions/me/history",
      {
        params: {
          query: {
            PageNumber: page,
            PageSize: pageSize,
            ...(transactionType ? { TransactionType: transactionType } : {}),
          },
        },
      },
    );
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to load loyalty history",
      );
    }
    const payload = response.data.payload;
    return {
      items: payload?.items ?? [],
      totalCount: payload?.totalCount ?? 0,
    };
  }
}

export const loyaltyService = new LoyaltyService();
