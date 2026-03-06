import { apiInstance } from "@/lib/api";

export interface ConcentrationLookupItem {
  id?: number;
  name?: string;
}

class ConcentrationService {
  async getConcentrationsLookup(): Promise<ConcentrationLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/concentrations/lookup");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch concentrations",
        );
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching concentrations:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch concentrations",
      );
    }
  }
}

export const concentrationService = new ConcentrationService();
