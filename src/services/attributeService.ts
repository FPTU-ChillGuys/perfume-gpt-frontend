import { apiInstance } from "@/lib/api";
import type {
  AttributeLookupItem,
  AttributeValueLookupItem,
} from "@/types/product";

const normalizeText = (value?: string | null) =>
  (value || "").trim().toLowerCase();

const generateInternalCode = (name: string) => {
  const baseCode = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return baseCode || `ATTR_${Date.now()}`;
};

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
        "/api/attributes/{attributeId}/values/lookup",
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

  async createAttribute(
    payload: Pick<AttributeLookupItem, "name" | "description" | "isVariantLevel"> & {
      internalCode?: string | null;
    },
  ): Promise<AttributeLookupItem> {
    try {
      const name = payload.name?.trim();
      if (!name) {
        throw new Error("Tên attribute không được để trống");
      }

      const internalCode =
        payload.internalCode?.trim() || generateInternalCode(name);

      const response = await apiInstance.POST("/api/attributes", {
        body: {
          internalCode,
          name,
          description: payload.description?.trim() || null,
          isVariantLevel: Boolean(payload.isVariantLevel),
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to create attribute");
      }

      const attributes = await this.getAttributes();
      const created = attributes.find(
        (item) =>
          normalizeText(item.name) === normalizeText(name) &&
          normalizeText(item.description) ===
            normalizeText(payload.description || ""),
      );
      if (created) {
        return created;
      }

      const fallback = attributes.find(
        (item) => normalizeText(item.name) === normalizeText(name),
      );
      if (fallback) {
        return fallback;
      }

      throw new Error("Không thể lấy thông tin attribute vừa tạo");
    } catch (error: any) {
      console.error("Error creating attribute:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create attribute",
      );
    }
  }

  async createAttributeValue(
    attributeId: number,
    value: string,
  ): Promise<AttributeValueLookupItem> {
    try {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        throw new Error("Giá trị attribute không được để trống");
      }

      const response = await apiInstance.POST(
        "/api/attributes/{attributeId}/values",
        {
          params: {
            path: {
              attributeId,
            },
          },
        body: {
          value: trimmedValue,
        },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to create attribute value",
        );
      }

      const values = await this.getAttributeValues(attributeId);
      const created = values.find(
        (item) => normalizeText(item.value) === normalizeText(trimmedValue),
      );
      if (created) {
        return created;
      }

      throw new Error("Không thể lấy giá trị attribute vừa tạo");
    } catch (error: any) {
      console.error("Error creating attribute value:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create attribute value",
      );
    }
  }

  async updateAttribute(
    attributeId: number,
    payload: { name: string; description?: string | null; isVariantLevel: boolean },
  ): Promise<void> {
    try {
      const response = await apiInstance.PUT("/api/attributes/{attributeId}", {
        params: { path: { attributeId } },
        body: payload,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update attribute");
      }
    } catch (error: any) {
      console.error("Error updating attribute:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to update attribute",
      );
    }
  }

  async deleteAttribute(attributeId: number): Promise<void> {
    try {
      const response = await apiInstance.DELETE("/api/attributes/{attributeId}", {
        params: { path: { attributeId } },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to delete attribute");
      }
    } catch (error: any) {
      console.error("Error deleting attribute:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to delete attribute",
      );
    }
  }

  async updateAttributeValue(valueId: number, value: string): Promise<void> {
    try {
      const response = await apiInstance.PUT("/api/attributes/values/{valueId}", {
        params: { path: { valueId } },
        body: { value: value.trim() },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update attribute value");
      }
    } catch (error: any) {
      console.error("Error updating attribute value:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to update attribute value",
      );
    }
  }

  async deleteAttributeValue(valueId: number): Promise<void> {
    try {
      const response = await apiInstance.DELETE("/api/attributes/values/{valueId}", {
        params: { path: { valueId } },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to delete attribute value");
      }
    } catch (error: any) {
      console.error("Error deleting attribute value:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to delete attribute value",
      );
    }
  }
}

export const attributeService = new AttributeService();
