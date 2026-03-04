import { apiInstance } from "@/lib/api";

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
}

export const categoryService = new CategoryService();
