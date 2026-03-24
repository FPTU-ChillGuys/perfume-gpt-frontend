import { apiInstance } from "@/lib/api";

export interface SupplierLookupItem {
  id?: number;
  name?: string;
}

export interface SupplierDetail {
  id?: number;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface PagedSuppliers {
  items: SupplierDetail[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateSupplierRequest {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
}

class SupplierService {
  private readonly BASE = "/api/suppliers";

  async getLookup(): Promise<SupplierLookupItem[]> {
    const response = await apiInstance.GET(`${this.BASE}/lookup` as any, {} as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load suppliers");
    }
    return (response.data.payload as SupplierLookupItem[]) ?? [];
  }

  async getAll(params?: {
    SearchTerm?: string;
    PageNumber?: number;
    PageSize?: number;
  }): Promise<PagedSuppliers> {
    const response = await apiInstance.GET(this.BASE as any, {
      params: { query: params },
    } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load suppliers");
    }
    const payload = response.data.payload as any;
    return {
      items: payload?.items ?? [],
      totalCount: payload?.totalCount ?? 0,
      pageNumber: payload?.pageNumber ?? 1,
      pageSize: payload?.pageSize ?? 10,
      totalPages: payload?.totalPages ?? 1,
    };
  }

  async create(body: CreateSupplierRequest): Promise<SupplierDetail> {
    const response = await apiInstance.POST(this.BASE as any, { body } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to create supplier");
    }
    return response.data.payload as SupplierDetail;
  }

  async update(
    id: number,
    body: Partial<CreateSupplierRequest>,
  ): Promise<SupplierDetail> {
    const response = await apiInstance.PUT(`${this.BASE}/{id}` as any, {
      params: { path: { id } },
      body,
    } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to update supplier");
    }
    return response.data.payload as SupplierDetail;
  }

  async delete(id: number): Promise<void> {
    const response = await apiInstance.DELETE(`${this.BASE}/{id}` as any, {
      params: { path: { id } },
    } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to delete supplier");
    }
  }

  async getById(id: number): Promise<SupplierDetail> {
    const response = await apiInstance.GET(`${this.BASE}/{id}` as any, {
      params: { path: { id } },
    } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load supplier");
    }
    return response.data.payload as SupplierDetail;
  }
}

export const supplierService = new SupplierService();
