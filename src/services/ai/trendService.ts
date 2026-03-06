import { aiApiInstance } from "@/lib/api";
import type { ProductListItem } from "@/types/product";
import dayjs from "dayjs";

class TrendService {
    async getTrendingProducts(period: "weekly" | "monthly" | "yearly" = "weekly", endDate: string = dayjs().startOf("day").toISOString(), startDate?: string,): Promise<ProductListItem[]> {
        try {
            const response = await aiApiInstance.GET("/trends/product/caching", {
                params: {
                    query: {
                        period,
                        ...(endDate ? { endDate } : {}),
                        ...(startDate ? { startDate } : {})
                    }
                }
            });
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to fetch trending products");
            }
            return Array.isArray(response.data.data) ? response.data.data : [];
        } catch (error: any) {
            console.error("Error fetching trending products:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch trending products");
        }
    }
}

export const trendService = new TrendService();
