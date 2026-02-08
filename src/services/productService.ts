import { apiInstance } from "@/lib/api";
import type { Supplier, ProductVariant } from "@/types/product";

class ProductService {
  private readonly SUPPLIERS_ENDPOINT = "/api/suppliers/lookup";
  private readonly VARIANTS_ENDPOINT = "/api/productvariants/lookup";

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await apiInstance.GET(this.SUPPLIERS_ENDPOINT);

      if (!response.data!.success) {
        throw new Error(response.data!.message || "Failed to fetch suppliers");
      }

      return response.data!.payload!;
    } catch (error: any) {
      console.error("Error fetching suppliers:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch suppliers",
      );
    }
  }

  async getProductVariants(productId?: string): Promise<ProductVariant[]> {
    try {
      const response = await apiInstance.GET(this.VARIANTS_ENDPOINT, {
        params: {
          query: {
            productId: productId,
          },
        },
      });


      if (!response.data!.success) {
        throw new Error(response.data!.message || "Failed to fetch variants");
      }

      return response.data!.payload!;
    } catch (error: any) {
      console.error("Error fetching variants:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product variants",
      );
    }
  }
}

export const productService = new ProductService();
