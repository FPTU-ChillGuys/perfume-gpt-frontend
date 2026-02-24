import { apiInstance } from "@/lib/api";
import type {
  AttributeLookupItem,
  AttributeValueLookupItem,
} from "@/types/product";

class AttributeService {
  async getAttributes(): Promise<AttributeLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/attributes/lookup");

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch attributes");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching attributes:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch attributes",
      );
    }
  }

  async getAttributeValues(
    attributeId: number,
  ): Promise<AttributeValueLookupItem[]> {
    try {
      const response = await apiInstance.GET(
        "/api/attributes/values/lookup/{attributeId}",
        {
          params: {
            path: {
              attributeId,
            },
          },
        },
      );

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to fetch attribute values",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching attribute values:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch attribute values",
      );
    }
  }
}

export const attributeService = new AttributeService();
