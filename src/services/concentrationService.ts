import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export interface ConcentrationLookupItem {
  id?: number;
  name?: string;
}

export type ConcentrationResponse =
  components["schemas"]["ConcentrationResponse"];

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

  async getAllConcentrations(): Promise<ConcentrationResponse[]> {
    const response = await apiInstance.GET("/api/concentrations");
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to fetch concentrations",
      );
    }
    return (response.data.payload as ConcentrationResponse[]) ?? [];
  }

  async createConcentration(name: string): Promise<ConcentrationResponse> {
    const response = await apiInstance.POST("/api/concentrations", {
      body: { name: name.trim() },
    });
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to create concentration",
      );
    }
    return response.data.payload as ConcentrationResponse;
  }

  async updateConcentration(
    id: number,
    name: string,
  ): Promise<ConcentrationResponse> {
    const response = await apiInstance.PUT("/api/concentrations/{id}", {
      params: { path: { id } },
      body: { name: name.trim() },
    });
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to update concentration",
      );
    }
    return response.data.payload as ConcentrationResponse;
  }

  async deleteConcentration(id: number): Promise<void> {
    const response = await apiInstance.DELETE("/api/concentrations/{id}", {
      params: { path: { id } },
    });
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to delete concentration",
      );
    }
  }
}

export const concentrationService = new ConcentrationService();
