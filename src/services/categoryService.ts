import { apiInstance } from "@/lib/api";
import { dexieCache } from "@/utils/dexieCache";
import { CACHE_KEYS, CACHE_TTL } from "@/constants/cache";

export interface CategoryLookupItem {
  id?: number;
  name?: string;
}

class CategoryService {
  async getCategoriesLookup(): Promise<CategoryLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/categories/lookup");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch categories",
        );
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch categories",
      );
    }
  }

  async getCategoriesLookupCached(): Promise<CategoryLookupItem[]> {
    return dexieCache.getOrFetch(
      CACHE_KEYS.CATEGORIES_LOOKUP,
      () => this.getCategoriesLookup(),
      CACHE_TTL.ONE_HOUR * 2,
    );
  }
}

export const categoryService = new CategoryService();
