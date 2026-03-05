import { apiInstance } from "@/lib/api";

export interface BrandLookupItem {
  id?: number;
  name?: string;
}

class BrandService {
  async getBrandsLookup(): Promise<BrandLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/brands/lookup");

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch brands");
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch brands",
      );
    }
  }
}

export const brandService = new BrandService();
