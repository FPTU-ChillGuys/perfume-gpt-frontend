import { apiInstance } from "@/lib/api";

export interface DashboardOverview {
  totalUsers?: number;
  totalProducts?: number;
  totalOrders?: number;
  totalRevenue?: number;
  pendingOrders?: number;
  lowStockProducts?: number;
}

export interface RevenueData {
  date?: string;
  revenue?: number;
  orderCount?: number;
}

export interface TopProduct {
  productId?: string;
  productName?: string;
  totalSold?: number;
  totalRevenue?: number;
  imageUrl?: string;
}

export interface InventoryLevelItem {
  productId?: string;
  productName?: string;
  variantName?: string;
  currentStock?: number;
  minStock?: number;
  status?: string;
}

class AdminDashboardService {
  private readonly BASE = "/api/admin/dashboard";

  async getOverview(): Promise<DashboardOverview> {
    const response = await apiInstance.GET(`${this.BASE}/overview` as any, {} as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load overview");
    }
    return (response.data.payload as DashboardOverview) ?? {};
  }

  async getRevenue(params?: {
    FromDate?: string;
    ToDate?: string;
  }): Promise<RevenueData[]> {
    const response = await apiInstance.GET(`${this.BASE}/revenue` as any, {
      params: { query: params },
    } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load revenue");
    }
    return (response.data.payload as RevenueData[]) ?? [];
  }

  async getTopProducts(params?: { Top?: number }): Promise<TopProduct[]> {
    const response = await apiInstance.GET(
      `${this.BASE}/top-products` as any,
      { params: { query: params } } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load top products");
    }
    return (response.data.payload as TopProduct[]) ?? [];
  }

  async getInventoryLevels(): Promise<InventoryLevelItem[]> {
    const response = await apiInstance.GET(
      `${this.BASE}/inventory-levels` as any,
      {} as any,
    );
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to load inventory levels",
      );
    }
    return (response.data.payload as InventoryLevelItem[]) ?? [];
  }
}

export const adminDashboardService = new AdminDashboardService();
