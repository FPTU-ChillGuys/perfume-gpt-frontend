import { apiInstance } from "@/lib/api";
import { dexieCache } from "@/utils/dexieCache";
import { CACHE_KEYS, CACHE_TTL } from "@/constants/cache";
import type { components } from "@/types/api/v1";

export interface CategoryLookupItem {
  id?: number;
  name?: string;
}

export type CategoryResponse = components["schemas"]["CategoryResponse"];

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

  async getAllCategories(): Promise<CategoryResponse[]> {
    const response = await apiInstance.GET("/api/categories");
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to fetch categories");
    }
    return (response.data.payload as CategoryResponse[]) ?? [];
  }

  async createCategory(name: string): Promise<CategoryResponse> {
    const response = await apiInstance.POST("/api/categories", {
      body: { name: name.trim() },
    });
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to create category");
    }
    return response.data.payload as CategoryResponse;
  }

  async updateCategory(id: number, name: string): Promise<CategoryResponse> {
    const response = await apiInstance.PUT("/api/categories/{id}", {
      params: { path: { id } },
      body: { name: name.trim() },
    });
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to update category");
    }
    return response.data.payload as CategoryResponse;
  }

  async deleteCategory(id: number): Promise<void> {
    const response = await apiInstance.DELETE("/api/categories/{id}", {
      params: { path: { id } },
    });
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to delete category");
    }
  }
}

export const categoryService = new CategoryService();
