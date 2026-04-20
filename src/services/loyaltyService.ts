import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type LoyaltyPointResponse =
  components["schemas"]["LoyaltyTransactionTotalsResponse"];

export type LoyaltyHistoryItem =
  components["schemas"]["LoyaltyTransactionHistoryItemResponse"] & {
    createdAt?: string | null;
  };

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

  /** Admin: get history for a specific user */
  async getUserHistory(
    userId: string,
    page = 1,
    pageSize = 10,
    transactionType?: LoyaltyTransactionType,
  ): Promise<{ items: LoyaltyHistoryItem[]; totalCount: number }> {
    const fetchSingle = async (type: LoyaltyTransactionType, p: number, ps: number) => {
      const res = (await apiInstance.GET("/api/loyaltytransactions" as never, {
        params: {
          query: { UserId: userId, PageNumber: p, PageSize: ps, IsDescending: true, TransactionType: type },
        },
      } as never)) as any;
      const payload = res.data?.payload;
      return { items: (payload?.items ?? []) as LoyaltyHistoryItem[], totalCount: (payload?.totalCount ?? 0) as number };
    };

    // When no filter: API may default to Earn only — fetch both types, merge & sort client-side
    if (!transactionType) {
      const [earn, spend] = await Promise.all([
        fetchSingle("Earn", 1, 500),
        fetchSingle("Spend", 1, 500),
      ]);
      const merged = [...earn.items, ...spend.items].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      const start = (page - 1) * pageSize;
      return { items: merged.slice(start, start + pageSize), totalCount: merged.length };
    }

    const result = await fetchSingle(transactionType, page, pageSize);
    return result;
  }

  /** Admin: manual point change (earn or spend) */
  async manualChange(
    userId: string,
    points: number,
    transactionType: LoyaltyTransactionType,
    reason: string,
  ): Promise<void> {
    const response = await apiInstance.POST(
      "/api/loyaltytransactions/{userId}/manual-change",
      {
        params: { path: { userId } },
        body: { transactionType, points, reason },
      },
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to change points");
    }
  }
}

export const loyaltyService = new LoyaltyService();
