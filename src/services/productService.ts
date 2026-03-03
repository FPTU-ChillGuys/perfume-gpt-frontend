import { apiInstance } from "@/lib/api";
import type {
  Supplier,
  ProductVariant,
  ProductListItem,
  ProductListItemWithVariants,
  PagedProductList,
  PagedProductListWithVariants,
  PagedVariantList,
  ProductFastLook,
  ProductImageUploadPayload,
  ProductInformation,
  ProductLookupItem,
  TemporaryMediaResponse,
  UpdateProductRequest,
  VariantPagedItem,
  MediaResponse,
} from "@/types/product";

type PaginatedQuery = {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
};

type SemanticProductSearchQuery = {
  searchText?: string;
  GenderValueId?: number | null;
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

  async searchProductsSemantic(
    query: SemanticProductSearchQuery,
  ): Promise<PagedProductListWithVariants> {
    try {
      const response = await apiInstance.GET(
        "/api/products/search/semantic",
        {
          params: { query },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to search products",
        );
      }

      return (
        response.data.payload ||
        this.createEmptyPagedResult<ProductListItemWithVariants>(query)
      );
    } catch (error: any) {
      console.error("Error searching products semantically:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to search products",
      );
    }
  }

  async lookupProducts(): Promise<ProductLookupItem[]> {
    try {
      const response = await apiInstance.GET("/api/products/lookup");

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch lookups");
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching product lookup:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product lookup",
      );
    }
  }

  async getProductVariantsPaged(
    query?: PaginatedQuery,
  ): Promise<PagedVariantList> {
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

  async getBestSellers(): Promise<PagedProductList> {
    try {
      const response = await apiInstance.GET("/api/products/best-sellers", {
        params: {
          query: {
            PageNumber: 1,
            PageSize: 10,
            IsDescending: true,
          },
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch best sellers",
        );
      }

      return (
        response.data.payload || this.createEmptyPagedResult<ProductListItem>()
      );
    } catch (error: any) {
      console.error("Error fetching best sellers:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch best sellers",
      );
    }
  }

  async getNewArrivals(): Promise<PagedProductList> {
    try {
      const response = await apiInstance.GET("/api/products/new-arrivals", {
        params: {
          query: {
            PageNumber: 1,
            PageSize: 10,
            IsDescending: true,
          },
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch new arrivals",
        );
      }

      return (
        response.data.payload || this.createEmptyPagedResult<ProductListItem>()
      );
    } catch (error: any) {
      console.error("Error fetching new arrivals:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch new arrivals",
      );
    }
  }

  async createProduct(request: CreateProductRequest): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/products", {
        body: request,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to create product");
      }

      return response.data.message || "Product created successfully";
    } catch (error: any) {
      console.error("Error creating product:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create product",
      );
    }
  }

  async updateProduct(
    productId: string,
    payload: UpdateProductRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT("/api/products/{productId}", {
        params: { path: { productId } },
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update product");
      }

      return response.data.message || "Product updated successfully";
    } catch (error: any) {
      console.error("Error updating product:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update product",
      );
    }
  }

  async deleteProduct(productId: string): Promise<string> {
    try {
      const response = await apiInstance.DELETE("/api/products/{productId}", {
        params: { path: { productId } },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to delete product");
      }

      return response.data.message || "Product deleted successfully";
    } catch (error: any) {
      console.error("Error deleting product:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete product",
      );
    }
  }

  async getProductImages(productId: string): Promise<MediaResponse[]> {
    try {
      const response = await apiInstance.GET("/api/products/{productId}/images", {
        params: { path: { productId } },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch product images");
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching product images:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product images",
      );
    }
  }

  async uploadProductImages(
    images: ProductImageUploadPayload[],
  ): Promise<TemporaryMediaResponse[]> {
    if (!images.length) {
      return [];
    }

    try {
      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append(`Images[${index}].ImageFile`, image.file);
        if (image.altText) {
          formData.append(`Images[${index}].AltText`, image.altText);
        }
        if (typeof image.displayOrder === "number") {
          formData.append(
            `Images[${index}].DisplayOrder`,
            image.displayOrder.toString(),
          );
        }
        if (typeof image.isPrimary === "boolean") {
          formData.append(
            `Images[${index}].IsPrimary`,
            image.isPrimary ? "true" : "false",
          );
        }
      });

      const response = await apiInstance.POST("/api/products/images/temporary", {
        body: { Images: [] },
        bodySerializer() {
          return formData;
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to upload product images",
        );
      }

      return response.data.payload?.data || [];
    } catch (error: any) {
      console.error("Error uploading product images:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload product images",
      );
    }
  }

  async getProductInformation(
    productId: string,
  ): Promise<ProductInformation | null> {
    try {
      const response = await apiInstance.GET(
        "/api/products/{productId}/information",
        {
          params: { path: { productId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch product information",
        );
      }

      return response.data.payload || null;
    } catch (error: any) {
      console.error("Error fetching product information:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product information",
      );
    }
  }

  async getProductFastLook(productId: string): Promise<ProductFastLook | null> {
    try {
      const response = await apiInstance.GET(
        "/api/products/{productId}/fast-look",
        {
          params: { path: { productId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch product fast look",
        );
      }

      return response.data.payload || null;
    } catch (error: any) {
      console.error("Error fetching product fast look:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product fast look",
      );
    }
  }
}

export const productService = new ProductService();
