import { aiApiInstance } from "@/lib/api";

interface ProductViewLogPayload {
  productId: string;
  variantId: string | null;
}

interface SearchLogPayload {
  searchText: string;
}

class ProductActivityLogService {
  async logProductView(productId?: string, variantId?: string | null): Promise<void> {
    if (!productId) {
      return;
    }

    const payload: ProductViewLogPayload = {
      productId,
      variantId: variantId ?? null,
    };

    const { error } = await (aiApiInstance as any).POST("/products/log/view", {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || "Failed to log product view");
    }
  }

  async logSearch(searchText?: string): Promise<void> {
    const normalizedText = searchText?.trim();
    if (!normalizedText) {
      return;
    }

    const payload: SearchLogPayload = {
      searchText: normalizedText,
    };

    const { error } = await (aiApiInstance as any).POST("/products/log/search", {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || "Failed to log search text");
    }
  }
}

export const productActivityLogService = new ProductActivityLogService();
