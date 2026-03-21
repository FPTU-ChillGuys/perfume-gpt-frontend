import { apiInstance } from "@/lib/api";
import type { ScentNoteLookupItem } from "@/types/product";

const normalizeName = (value?: string | null) =>
  (value || "").trim().toLowerCase();

class ScentNoteService {
  async getScentNotesLookup(): Promise<ScentNoteLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/scentnotes/lookup");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch scent notes",
        );
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching scent notes:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch scent notes",
      );
    }
  }

  async createScentNote(name: string): Promise<ScentNoteLookupItem> {
    try {
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error("Tên nốt hương không được để trống");
      }

      const response = await apiInstance.POST("/api/scentnotes", {
        body: {
          name: trimmedName,
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create scent note",
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

      const lookup = await this.getScentNotesLookup();
      const created = lookup.find(
        (item) => normalizeName(item.name) === normalizeName(trimmedName),
      );
      if (created) {
        return created;
      }

      throw new Error("Không thể lấy thông tin nốt hương vừa tạo");
    } catch (error: any) {
      console.error("Error creating scent note:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create scent note",
      );
    }
  }
}

export const scentNoteService = new ScentNoteService();
