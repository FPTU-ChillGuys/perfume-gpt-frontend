import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type LoyaltyPointResponse =
  components["schemas"]["LoyaltyTransactionTotalsResponse"];

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
          userId,
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
          userId,
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
}

export const loyaltyService = new LoyaltyService();
