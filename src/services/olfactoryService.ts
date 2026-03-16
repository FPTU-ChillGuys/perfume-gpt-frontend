import { apiInstance } from "@/lib/api";
import type { OlfactoryLookupItem } from "@/types/product";

class OlfactoryService {
  async getOlfactoryLookup(): Promise<OlfactoryLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/olfactoryfamilies/lookup");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch olfactory families",
        );
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching olfactory families:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch olfactory families",
      );
    }
  }
}

export const olfactoryService = new OlfactoryService();
