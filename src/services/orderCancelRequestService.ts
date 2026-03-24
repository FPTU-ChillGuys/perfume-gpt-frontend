import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type OrderCancelRequest = components["schemas"]["OrderCancelRequestResponse"];
export type ProcessCancelRequestBody = components["schemas"]["ProcessCancelRequestDto"];

export interface PagedCancelRequests {
  items: OrderCancelRequest[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

class OrderCancelRequestService {
  private readonly BASE = "/api/ordercancelrequests";

  async getAll(params?: {
    Status?: components["schemas"]["CancelRequestStatus"];
    PageNumber?: number;
    PageSize?: number;
    SortBy?: string;
    IsDescending?: boolean;
  }): Promise<PagedCancelRequests> {
    const response = await apiInstance.GET("/api/ordercancelrequests", {
      params: { query: params },
    });
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to load cancel requests",
      );
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

  async process(id: string, body: ProcessCancelRequestBody): Promise<string> {
    const response = await apiInstance.POST(
      "/api/ordercancelrequests/{id}/process",
      {
        params: { path: { id } },
        body,
      },
    );
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to process cancel request",
      );
    }
    return response.data.message || "Xử lý thành công";
  }
}

export const orderCancelRequestService = new OrderCancelRequestService();
