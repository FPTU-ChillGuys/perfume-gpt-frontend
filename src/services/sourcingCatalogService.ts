import { apiInstance } from "@/lib/api";

export interface CatalogItem {
  id?: string;
  productVariantId?: string;
  supplierId?: number;
  supplierName: string;
  variantSku: string;
  variantName: string;
  negotiatedPrice?: number;
  estimatedLeadTimeDays?: number;
  isPrimary?: boolean;
  primaryImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface VariantLookupItem {
  id?: string;
  barcode: string;
  sku: string;
  displayName: string;
  volumeMl?: number;
  concentrationName: string;
  basePrice?: number;
  primaryImageUrl?: string | null;
}

export interface CreateCatalogItemRequest {
  productVariantId: string;
  supplierId?: number;
  negotiatedPrice?: number;
  estimatedLeadTimeDays?: number;
  isPrimary?: boolean;
}

export interface UpdateCatalogItemRequest {
  negotiatedPrice?: number;
  estimatedLeadTimeDays?: number;
}

class SourcingCatalogService {
  private readonly BASE = "/api/sourcingcatalogs";
  private readonly VARIANTS_LOOKUP = "/api/productvariants/lookup";

  async getCatalog(supplierId?: number): Promise<CatalogItem[]> {
    const response = await apiInstance.GET(
      this.BASE as any,
      {
        params: { query: { supplierId } },
      } as any,
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load catalog");
    }

    return (response.data.payload as CatalogItem[]) ?? [];
  }

  async getLookupVariants(supplierId?: number): Promise<VariantLookupItem[]> {
    const response = await apiInstance.GET(
      this.VARIANTS_LOOKUP as any,
      {
        params: { query: { supplierId: supplierId?.toString() } },
      } as any,
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load products");
    }

    return (response.data.payload as VariantLookupItem[]) ?? [];
  }

  async create(body: CreateCatalogItemRequest): Promise<string> {
    const response = await apiInstance.POST(
      this.BASE as any,
      {
        body,
      } as any,
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to add product to catalog",
      );
    }

    return response.data.payload as string;
  }

  async update(id: string, body: UpdateCatalogItemRequest): Promise<string> {
    const response = await apiInstance.PUT(
      `${this.BASE}/{id}` as any,
      {
        params: { path: { id } },
        body,
      } as any,
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to update catalog item",
      );
    }

    return response.data.payload as string;
  }

  async setPrimary(id: string): Promise<string> {
    const response = await apiInstance.PUT(
      `${this.BASE}/{id}/set-primary` as any,
      {
        params: { path: { id } },
      } as any,
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to set primary supplier",
      );
    }

    return response.data.payload as string;
  }

  async delete(id: string): Promise<string> {
    const response = await apiInstance.DELETE(
      `${this.BASE}/{id}` as any,
      {
        params: { path: { id } },
      } as any,
    );

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to delete catalog item",
      );
    }

    return response.data.payload as string;
  }
}

export const sourcingCatalogService = new SourcingCatalogService();
