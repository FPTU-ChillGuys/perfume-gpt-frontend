import axiosInstance from "../lib/axios";

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  contactEmail: string | null;
}

export interface SuppliersResponse {
  payload: Supplier[];
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  displayName: string;
  volumeMl: number;
  concentrationName: string;
  basePrice: number;
  imageUrl: string | null;
}

export interface ProductVariantsResponse {
  payload: ProductVariant[];
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

class ProductService {
  private readonly SUPPLIERS_ENDPOINT = "/api/suppliers/lookup";
  private readonly VARIANTS_ENDPOINT = "/api/productvariants/lookup";

  async getSuppliers(): Promise<Supplier[]> {
    try {
      console.log("📦 Fetching suppliers...");
      const response = await axiosInstance.get<SuppliersResponse>(
        this.SUPPLIERS_ENDPOINT
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch suppliers");
      }

      console.log("✅ Suppliers fetched:", response.data.payload);
      return response.data.payload;
    } catch (error: any) {
      console.error("❌ Error fetching suppliers:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch suppliers"
      );
    }
  }

  async getProductVariants(productId?: string): Promise<ProductVariant[]> {
    try {
      console.log("📦 Fetching product variants...", { productId });
      
      let url = this.VARIANTS_ENDPOINT;
      if (productId) {
        url += `?productId=${productId}`;
      }

      const response = await axiosInstance.get<ProductVariantsResponse>(url);

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to fetch variants");
      }

      console.log("✅ Variants fetched:", response.data.payload);
      return response.data.payload;
    } catch (error: any) {
      console.error("❌ Error fetching variants:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product variants"
      );
    }
  }
}

export const productService = new ProductService();
