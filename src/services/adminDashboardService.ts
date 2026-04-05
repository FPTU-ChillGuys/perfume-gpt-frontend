import { apiInstance } from "@/lib/api";

export interface DashboardOverview {
  revenue?: RevenueSummary;
  inventoryLevels?: InventoryLevelsSummary;
  topProducts?: TopProduct[];
}

export interface RevenueSummary {
  fromDate?: string;
  toDate?: string;
  grossRevenue?: number;
  refundedAmount?: number;
  netRevenue?: number;
  successfulTransactionsCount?: number;
  paidOrdersCount?: number;
}

export interface TopProduct {
  productId?: string;
  productName?: string;
  totalUnitsSold?: number;
  revenue?: number;
  imageUrl?: string;
}

export interface InventoryLevelsSummary {
  totalVariants?: number;
  totalStockQuantity?: number;
  totalAvailableQuantity?: number;
  lowStockVariantsCount?: number;
  outOfStockVariantsCount?: number;
  totalBatches?: number;
  expiredBatchesCount?: number;
  expiringSoonCount?: number;
}

class AdminDashboardService {
  private readonly BASE = "/api/admindashboard";

  async getOverview(params?: {
    FromDate?: string;
    ToDate?: string;
  }): Promise<DashboardOverview> {
    const response = await apiInstance.GET(
      `${this.BASE}/overview` as any,
      {
        params: { query: params },
      } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load overview");
    }
    return (response.data.payload as DashboardOverview) ?? {};
  }

  async getRevenue(params?: {
    FromDate?: string;
    ToDate?: string;
  }): Promise<RevenueSummary> {
    const response = await apiInstance.GET(
      `${this.BASE}/revenue` as any,
      {
        params: { query: params },
      } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load revenue");
    }
    return (response.data.payload as RevenueSummary) ?? {};
  }

  async getTopProducts(params?: {
    Top?: number;
    FromDate?: string;
    ToDate?: string;
  }): Promise<TopProduct[]> {
    const response = await apiInstance.GET(
      `${this.BASE}/top-products` as any,
      { params: { query: params } } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load top products");
    }
    return (response.data.payload as TopProduct[]) ?? [];
  }

  async getInventoryLevels(): Promise<InventoryLevelsSummary> {
    const response = await apiInstance.GET(
      `${this.BASE}/inventory-levels` as any,
      {} as any,
    );
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to load inventory levels",
      );
    }
    return (response.data.payload as InventoryLevelsSummary) ?? {};
  }
}

export const adminDashboardService = new AdminDashboardService();
