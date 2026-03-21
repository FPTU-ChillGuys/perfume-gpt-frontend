import { apiInstance } from "@/lib/api";
import type { OlfactoryLookupItem } from "@/types/product";

const normalizeName = (value?: string | null) =>
  (value || "").trim().toLowerCase();

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

  async createOlfactoryFamily(name: string): Promise<OlfactoryLookupItem> {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Tên nhóm hương không được để trống");
      }

      const response = await apiInstance.POST("/api/olfactoryfamilies", {
        body: {
          name: trimmedName,
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create olfactory family",
        );
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

      const lookup = await this.getOlfactoryLookup();
      const created = lookup.find(
        (item) => normalizeName(item.name) === normalizeName(trimmedName),
      );
      if (created) {
        return created;
      }

      throw new Error("Không thể lấy thông tin nhóm hương vừa tạo");
    } catch (error: any) {
      console.error("Error creating olfactory family:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create olfactory family",
      );
    }
  }
}

export const olfactoryService = new OlfactoryService();
