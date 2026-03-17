import { apiInstance } from "@/lib/api";
import type { ScentNoteLookupItem } from "@/types/product";

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
}

export const scentNoteService = new ScentNoteService();
