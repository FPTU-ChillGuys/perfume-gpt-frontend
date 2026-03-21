import { apiInstance } from "@/lib/api";

export interface BrandLookupItem {
  id?: number;
  name?: string;
}

const normalizeName = (value?: string | null) =>
  (value || "").trim().toLowerCase();

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

  async createBrand(name: string): Promise<BrandLookupItem> {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Tên thương hiệu không được để trống");
      }

      const response = await apiInstance.POST("/api/brands", {
        body: {
          name: trimmedName,
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to create brand");
      }

      const payload = response.data.payload;
      const createdId = payload?.id;
      const createdName = payload?.name;
      if (typeof createdId === "number") {
        return {
          id: createdId,
          name: createdName || trimmedName,
        };
      }

      const lookup = await this.getBrandsLookup();
      const created = lookup.find(
        (item) => normalizeName(item.name) === normalizeName(trimmedName),
      );
      if (created) {
        return created;
      }

      throw new Error("Không thể lấy thông tin thương hiệu vừa tạo");
    } catch (error: any) {
      console.error("Error creating brand:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create brand",
      );
    }
  }
}

export const brandService = new BrandService();
