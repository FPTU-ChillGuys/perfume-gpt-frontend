import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type LoyaltyPointResponse = components["schemas"]["GetLoyaltyPointResponse"];

class LoyaltyService {
  async getMyBalance(): Promise<LoyaltyPointResponse> {
    const response = await apiInstance.GET("/api/loyaltytransactions/me", {});
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to load loyalty balance",
      );
    }
    return (response.data.payload as LoyaltyPointResponse) ?? {};
  }

  async addPoints(userId: string, points: number, description?: string): Promise<void> {
    const response = await apiInstance.POST(
      "/api/loyaltytransactions/{userId}/plus",
      {
        params: { path: { userId } },
        body: { points, description } as any,
      },
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to add points");
    }
  }

  async redeemPoints(userId: string, points: number, description?: string): Promise<void> {
    const response = await apiInstance.POST(
      "/api/loyaltytransactions/{userId}/redeem",
      {
        params: { path: { userId } },
        body: { points, description } as any,
      },
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to redeem points");
    }
  }
}

export const loyaltyService = new LoyaltyService();
