import { apiInstance } from "@/lib/api";
import type {
  Supplier,
  ProductVariant,
  ProductListItem,
  ProductDetail,
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
  UpdateVariantRequest,
  VariantLookupItem,
  VariantPagedItem,
  MediaResponse,
  CreateProductRequest,
  CreateVariantRequest,
} from "@/types/product";

type PaginatedQuery = {
  CategoryId?: number | null;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
};

type HomeProductQuery = Pick<
  PaginatedQuery,
  "PageNumber" | "PageSize" | "IsDescending"
>;

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

  private extractApiErrorMessage(
    apiResult: unknown,
    fallbackMessage: string,
  ): string {
    const payload = apiResult as {
      message?: string;
      errors?: string[] | null;
      error?: { message?: string; errors?: string[] | null };
    };

    return (
      payload?.message ||
      payload?.error?.message ||
      payload?.errors?.join(", ") ||
      payload?.error?.errors?.join(", ") ||
      fallbackMessage
    );
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

  async getProductVariants(productId?: string): Promise<VariantLookupItem[]> {
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
      // Endpoint not in generated OpenAPI spec — bypass strict path typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (apiInstance as any).GET(
        "/api/products/search/semantic",
        { params: { query } },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to search products");
      }

      return (
        (response.data.payload as PagedProductListWithVariants) ||
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

  async getProductDetail(productId: string): Promise<ProductDetail | null> {
    try {
      const response = await apiInstance.GET("/api/products/{productId}", {
        params: { path: { productId } },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch product");
      }

      return response.data.payload || null;
    } catch (error: any) {
      console.error("Error fetching product detail:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch product detail",
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

  async getBestSellers(query?: HomeProductQuery): Promise<PagedProductList> {
    try {
      const response = await apiInstance.GET("/api/products/best-sellers", {
        params: {
          query: {
            PageNumber: query?.PageNumber ?? 1,
            PageSize: query?.PageSize ?? 24,
            IsDescending: query?.IsDescending ?? true,
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

  async getNewArrivals(query?: HomeProductQuery): Promise<PagedProductList> {
    try {
      const response = await apiInstance.GET("/api/products/new-arrivals", {
        params: {
          query: {
            PageNumber: query?.PageNumber ?? 1,
            PageSize: query?.PageSize ?? 24,
            IsDescending: query?.IsDescending ?? true,
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

      if (response.error) {
        throw new Error(
          this.extractApiErrorMessage(
            response.error,
            "Failed to create product",
          ),
        );
      }

      if (!response.data?.success) {
        throw new Error(
          this.extractApiErrorMessage(
            response.data,
            "Failed to create product",
          ),
        );
      }

      return response.data.message || "Product created successfully";
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create product",
      );
    }
  }

  async createProductVariant(
    payload: CreateVariantRequest & { barcode?: string },
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(this.PRODUCT_VARIANTS_ENDPOINT, {
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to create variant");
      }

      return response.data.message || "Variant created successfully";
    } catch (error: any) {
      console.error("Error creating product variant:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create product variant",
      );
    }
  }

  async getVariantById(variantId: string): Promise<ProductVariant> {
    try {
      const response = await apiInstance.GET(
        "/api/productvariants/{variantId}",
        { params: { path: { variantId } } },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch variant");
      }

      return response.data.payload!;
    } catch (error: any) {
      console.error("Error fetching variant:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch variant",
      );
    }
  }

  async updateProductVariant(
    variantId: string,
    payload: UpdateVariantRequest & {
      barcode?: string;
      mediaIdsToDelete?: string[] | null;
      temporaryMediaIdsToAdd?: string[] | null;
      lowStockThreshold?: number;
    },
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/productvariants/{variantId}",
        {
          params: { path: { variantId } },
          body: payload,
        },
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update variant");
      }

      return response.data.message || "Variant updated successfully";
    } catch (error: any) {
      console.error("Error updating product variant:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update product variant",
      );
    }
  }

  async deleteProductVariant(variantId: string): Promise<string> {
    try {
      const response = await apiInstance.DELETE(
        "/api/productvariants/{variantId}",
        {
          params: { path: { variantId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to delete variant");
      }

      return response.data.message || "Variant deleted successfully";
    } catch (error: any) {
      console.error("Error deleting product variant:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete product variant",
      );
    }
  }

  async setVariantImagePrimary(mediaId: string): Promise<void> {
    try {
      const response = await apiInstance.PUT(
        "/api/productvariants/images/{mediaId}/set-primary",
        {
          params: { path: { mediaId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to set primary image",
        );
      }
    } catch (error: any) {
      console.error("Error setting primary image:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to set primary image",
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

      if (response.error) {
        throw new Error(
          this.extractApiErrorMessage(
            response.error,
            "Failed to update product",
          ),
        );
      }

      if (!response.data?.success) {
        throw new Error(
          this.extractApiErrorMessage(
            response.data,
            "Failed to update product",
          ),
        );
      }

      const metadata = (response.data as any)?.payload?.metadata as
        | {
            hasPartialFailure?: boolean;
            allSucceeded?: boolean;
            operations?: Array<{
              operationName?: string;
              errors?: Array<{ errorMessage?: string }>;
            }>;
          }
        | undefined;

      if (metadata?.hasPartialFailure || metadata?.allSucceeded === false) {
        const operationErrors =
          metadata?.operations
            ?.flatMap((operation) => operation.errors || [])
            .map((error) => error.errorMessage)
            .filter((message): message is string => Boolean(message)) || [];

        if (operationErrors.length > 0) {
          throw new Error(operationErrors.join(" "));
        }

        throw new Error(
          response.data.message ||
            "Cập nhật sản phẩm thất bại một phần. Vui lòng kiểm tra lại thao tác media.",
        );
      }

      return response.data.message || "Product updated successfully";
    } catch (error: any) {
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
      const response = await apiInstance.GET(
        "/api/products/{productId}/images",
        {
          params: { path: { productId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch product images",
        );
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

  async setPrimaryProductImage(mediaId: string): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/products/images/{mediaId}/set-primary",
        {
          params: { path: { mediaId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to set primary image",
        );
      }

      return response.data.message || "Primary image updated";
    } catch (error: any) {
      console.error("Error setting primary image:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to set primary image",
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

      const response = await apiInstance.POST(
        "/api/products/images/temporary",
        {
          body: { Images: [] },
          bodySerializer() {
            return formData;
          },
        },
      );

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

  async uploadVariantImages(
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

      const response = await apiInstance.POST(
        "/api/productvariants/images/temporary",
        {
          body: { Images: [] },
          bodySerializer() {
            return formData;
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to upload variant images",
        );
      }

      return response.data.payload?.data || [];
    } catch (error: any) {
      console.error("Error uploading variant images:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload variant images",
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
