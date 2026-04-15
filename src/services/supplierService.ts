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
  phone?: string;
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
  phone?: string;
  address?: string;
}

class SupplierService {
  private readonly BASE = "/api/suppliers";

  async getLookup(): Promise<SupplierLookupItem[]> {
    const response = await apiInstance.GET(
      `${this.BASE}/lookup` as any,
      {} as any,
    );
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
    // API không hỗ trợ phân trang/search, lấy tất cả rồi filter trên client
    const response = await apiInstance.GET(this.BASE as any, {} as any);

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load suppliers");
    }

    let items = (response.data.payload as any[]) ?? [];

    // Client-side search filter
    if (params?.SearchTerm) {
      const searchLower = params.SearchTerm.toLowerCase();
      items = items.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(searchLower) ||
          s.contactEmail?.toLowerCase().includes(searchLower) ||
          s.phone?.toLowerCase().includes(searchLower) ||
          s.address?.toLowerCase().includes(searchLower),
      );
    }

    const totalCount = items.length;
    const pageNumber = params?.PageNumber ?? 1;
    const pageSize = params?.PageSize ?? 10;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Client-side pagination
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedItems = items.slice(startIndex, endIndex);

    // Map phone to contactPhone for compatibility
    const mappedItems = pagedItems.map((s: any) => ({
      ...s,
      contactPhone: s.phone || s.contactPhone,
    }));

    return {
      items: mappedItems,
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
    };
  }

  async create(body: CreateSupplierRequest): Promise<SupplierDetail> {
    // Map contactPhone to phone for API
    const apiBody = {
      name: body.name,
      contactEmail: body.contactEmail || "",
      phone: body.contactPhone || body.phone || "",
      address: body.address || "",
    };
    
    const response = await apiInstance.POST(this.BASE as any, { body: apiBody } as any);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to create supplier");
    }
    const result = response.data.payload as any;
    return {
      ...result,
      contactPhone: result.phone || result.contactPhone,
    };
  }

  async update(
    id: number,
    body: Partial<CreateSupplierRequest>,
  ): Promise<SupplierDetail> {
    // Map contactPhone to phone for API
    const apiBody: any = {};
    if (body.name !== undefined) apiBody.name = body.name;
    if (body.contactEmail !== undefined) apiBody.contactEmail = body.contactEmail;
    if (body.contactPhone !== undefined || body.phone !== undefined) {
      apiBody.phone = body.contactPhone || body.phone;
    }
    if (body.address !== undefined) apiBody.address = body.address;
    
    const response = await apiInstance.PUT(
      `${this.BASE}/{id}` as any,
      {
        params: { path: { id } },
        body: apiBody,
      } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to update supplier");
    }
    const result = response.data.payload as any;
    return {
      ...result,
      contactPhone: result.phone || result.contactPhone,
    };
  }

  async delete(id: number): Promise<void> {
    const response = await apiInstance.DELETE(
      `${this.BASE}/{id}` as any,
      {
        params: { path: { id } },
      } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to delete supplier");
    }
  }

  async getById(id: number): Promise<SupplierDetail> {
    const response = await apiInstance.GET(
      `${this.BASE}/{id}` as any,
      {
        params: { path: { id } },
      } as any,
    );
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to load supplier");
    }
    const result = response.data.payload as any;
    return {
      ...result,
      contactPhone: result.phone || result.contactPhone,
    };
  }
}

export const supplierService = new SupplierService();
