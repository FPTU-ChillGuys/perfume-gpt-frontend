import { apiInstance } from "@/lib/api";
import type {
  Supplier,
  ProductVariant,
  ProductListItem,
  PagedProductList,
  PagedVariantList,
  VariantPagedItem,
} from "@/types/product";

type PaginatedQuery = {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
};

class ProductService {
  private readonly SUPPLIERS_ENDPOINT = "/api/suppliers/lookup";
  private readonly VARIANTS_LOOKUP_ENDPOINT = "/api/productvariants/lookup";
  private readonly PRODUCTS_ENDPOINT = "/api/products";
  private readonly PRODUCT_VARIANTS_ENDPOINT = "/api/productvariants";

  private createEmptyPagedResult<T>(query?: PaginatedQuery) {
    return {
      items: [] as T[],
      pageNumber: query?.PageNumber ?? 1,
      pageSize: query?.PageSize ?? 0,
      totalCount: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

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
      const response = await apiInstance.GET(this.VARIANTS_LOOKUP_ENDPOINT, {
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

  async getProducts(query?: PaginatedQuery): Promise<PagedProductList> {
    try {
      const response = await apiInstance.GET(this.PRODUCTS_ENDPOINT, {
        params: {
          query,
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch products");
      }

      return (
        response.data.payload ||
        this.createEmptyPagedResult<ProductListItem>(query)
      );
    } catch (error: any) {
      console.error("Error fetching products:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch products",
      );
    }
  }

  async getProductVariantsPaged(query?: PaginatedQuery): Promise<PagedVariantList> {
    try {
      const response = await apiInstance.GET(this.PRODUCT_VARIANTS_ENDPOINT, {
        params: {
          query,
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch product variants",
        );
      }

      return (
        response.data.payload ||
        this.createEmptyPagedResult<VariantPagedItem>(query)
      );
    } catch (error: any) {
      console.error("Error fetching paged variants:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product variants",
      );
    }
  }
}

export const productService = new ProductService();
