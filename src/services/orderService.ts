import { apiInstance } from "@/lib/api";
import type {
  OrderListItem,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PagedOrderList,
  OrderResponse,
} from "@/types/order";
import type {
  CreateOrderRequest,
  CheckoutResponse,
  PaymentMethod,
  CreateInStoreOrderRequest,
} from "@/types/checkout";
import type { components } from "@/types/api/v1";

interface GetMyOrdersParams {
  Status?: OrderStatus;
  Type?: OrderType;
  PaymentStatus?: PaymentStatus;
  FromDate?: string;
  ToDate?: string;
  SearchTerm?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
}

interface GetAllOrdersParams extends GetMyOrdersParams {
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
}

export type OrderCancelRequest =
  components["schemas"]["OrderCancelRequestResponse"];
export type ProcessCancelRequestBody =
  components["schemas"]["ProcessCancelRequest"];

export interface PagedCancelRequests {
  items: OrderCancelRequest[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export type CreateReturnRequestDto =
  components["schemas"]["CreateReturnRequestDto"];
export type CreateReturnRequestDetailDto =
  components["schemas"]["CreateReturnRequestDetailDto"];
export type TemporaryMediaResponse =
  components["schemas"]["TemporaryMediaResponse"];
export type ProcessInitialReturnDto =
  components["schemas"]["ProcessInitialReturnDto"];
export type StartInspectionDto = components["schemas"]["StartInspectionDto"];
export type RecordInspectionDto = components["schemas"]["RecordInspectionDto"];
export type RejectInspectionDto = components["schemas"]["RejectInspectionDto"];

export type ReturnRequestStatus =
  | "Pending"
  | "ApprovedForReturn"
  | "Inspecting"
  | "ReadyForRefund"
  | "Rejected"
  | "Refunded"
  | string;

export interface OrderReturnRequestDetail {
  id?: string;
  orderDetailId?: string;
  requestedQuantity?: number;
  returnedQuantity?: number;
  quantity?: number;
  isRestocked?: boolean;
  note?: string | null;
  variantName?: string | null;
  productName?: string | null;
  unitPrice?: number;
}

export interface OrderReturnRequest {
  id?: string;
  orderId?: string;
  requestedByEmail?: string | null;
  reason?: string | null;
  customerNote?: string | null;
  staffNote?: string | null;
  inspectionNote?: string | null;
  status?: ReturnRequestStatus;
  requestedRefundAmount?: number;
  approvedRefundAmount?: number;
  createdAt?: string;
  updatedAt?: string | null;
  returnItems?: OrderReturnRequestDetail[];
  [key: string]: unknown;
}

export interface PagedReturnRequests {
  items: OrderReturnRequest[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

interface GetOrderCancelRequestsParams {
  Status?: components["schemas"]["CancelRequestStatus"];
  IsRefundRequired?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
}

interface GetOrderReturnRequestsParams {
  Status?: ReturnRequestStatus;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
}

interface FulfillOrderItemRequest {
  orderDetailId: string;
  scannedBatchCode: string;
  quantity: number;
}

interface FulfillOrderRequest {
  items: FulfillOrderItemRequest[];
}

class OrderService {
  private getValue<T = unknown>(
    source: unknown,
    keys: string[],
  ): T | undefined {
    if (!source || typeof source !== "object") {
      return undefined;
    }

    const objectSource = source as Record<string, unknown>;
    for (const key of keys) {
      const value = objectSource[key];
      if (value !== undefined) {
        return value as T;
      }
    }

    return undefined;
  }

  private normalizeReturnDetail(item: unknown): OrderReturnRequestDetail {
    return {
      id: this.getValue<string>(item, ["id", "Id", "detailId", "DetailId"]),
      orderDetailId: this.getValue<string>(item, [
        "orderDetailId",
        "OrderDetailId",
      ]),
      requestedQuantity: Number(
        this.getValue<number>(item, [
          "requestedQuantity",
          "RequestedQuantity",
        ]) ?? 0,
      ),
      returnedQuantity: Number(
        this.getValue<number>(item, ["returnedQuantity", "ReturnedQuantity"]) ??
          0,
      ),
      quantity: Number(
        this.getValue<number>(item, ["quantity", "Quantity"]) ?? 0,
      ),
      isRestocked: Boolean(
        this.getValue<boolean>(item, ["isRestocked", "IsRestocked"]),
      ),
      note: this.getValue<string | null>(item, ["note", "Note"]) ?? null,
      variantName:
        this.getValue<string | null>(item, ["variantName", "VariantName"]) ??
        null,
      productName:
        this.getValue<string | null>(item, ["productName", "ProductName"]) ??
        null,
      unitPrice: Number(
        this.getValue<number>(item, ["unitPrice", "UnitPrice"]) ?? 0,
      ),
    };
  }

  private normalizeReturnRequest(item: unknown): OrderReturnRequest {
    const rawItems =
      this.getValue<unknown[]>(item, ["returnItems", "ReturnItems"]) ||
      this.getValue<unknown[]>(item, ["details", "Details"]) ||
      [];

    return {
      id: this.getValue<string>(item, ["id", "Id"]),
      orderId: this.getValue<string>(item, ["orderId", "OrderId"]),
      requestedByEmail:
        this.getValue<string | null>(item, [
          "requestedByEmail",
          "RequestedByEmail",
        ]) ?? null,
      reason: this.getValue<string | null>(item, ["reason", "Reason"]) ?? null,
      customerNote:
        this.getValue<string | null>(item, ["customerNote", "CustomerNote"]) ??
        null,
      staffNote:
        this.getValue<string | null>(item, ["staffNote", "StaffNote"]) ?? null,
      inspectionNote:
        this.getValue<string | null>(item, [
          "inspectionNote",
          "InspectionNote",
        ]) ?? null,
      status:
        this.getValue<ReturnRequestStatus>(item, ["status", "Status"]) ??
        "Pending",
      requestedRefundAmount: Number(
        this.getValue<number>(item, [
          "requestedRefundAmount",
          "RequestedRefundAmount",
        ]) ?? 0,
      ),
      approvedRefundAmount: Number(
        this.getValue<number>(item, [
          "approvedRefundAmount",
          "ApprovedRefundAmount",
        ]) ?? 0,
      ),
      createdAt:
        this.getValue<string>(item, ["createdAt", "CreatedAt"]) ||
        new Date().toISOString(),
      updatedAt:
        this.getValue<string | null>(item, ["updatedAt", "UpdatedAt"]) ?? null,
      returnItems: rawItems.map((detail) => this.normalizeReturnDetail(detail)),
    };
  }

  async getMyOrders(
    params?: GetMyOrdersParams,
  ): Promise<{ items: OrderListItem[]; totalCount: number }> {
    try {
      const response = await apiInstance.GET("/api/orders/my-orders", {
        params: {
          query: params,
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch orders");
      }

      return {
        items: response.data.payload.items || [],
        totalCount: response.data.payload.totalCount || 0,
      };
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch orders",
      );
    }
  }

  async getAllOrders(params?: GetAllOrdersParams): Promise<PagedOrderList> {
    try {
      const response = await apiInstance.GET("/api/orders", {
        params: {
          query: params,
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch orders");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching all orders:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch orders",
      );
    }
  }

  async getAllCancelRequests(
    params?: GetOrderCancelRequestsParams,
  ): Promise<PagedCancelRequests> {
    try {
      const response = await apiInstance.GET("/api/ordercancelrequests", {
        params: {
          query: params,
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to load cancel requests",
        );
      }

      const payload = response.data.payload;
      return {
        items: payload?.items || [],
        totalCount: payload?.totalCount || 0,
        pageNumber: payload?.pageNumber || 1,
        pageSize: payload?.pageSize || 10,
        totalPages: payload?.totalPages || 1,
      };
    } catch (error: any) {
      console.error("Error fetching cancel requests:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load cancel requests",
      );
    }
  }

  async processCancelRequest(
    id: string,
    body: ProcessCancelRequestBody,
  ): Promise<string> {
    try {
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
    } catch (error: any) {
      console.error("Error processing cancel request:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to process cancel request",
      );
    }
  }

  async getAllReturnRequests(
    params?: GetOrderReturnRequestsParams,
  ): Promise<PagedReturnRequests> {
    try {
      const query = new URLSearchParams();

      if (params?.Status && params.Status !== "All") {
        query.set("Status", params.Status);
      }
      if (params?.PageNumber) {
        query.set("PageNumber", String(params.PageNumber));
      }
      if (params?.PageSize) {
        query.set("PageSize", String(params.PageSize));
      }
      if (params?.SortBy) {
        query.set("SortBy", params.SortBy);
      }
      if (params?.SortOrder) {
        query.set("SortOrder", params.SortOrder);
      }
      if (typeof params?.IsDescending === "boolean") {
        query.set("IsDescending", String(params.IsDescending));
      }

      const accessToken = localStorage.getItem("accessToken");
      const endpoint = `${import.meta.env.VITE_API_BASE_URL}/api/orderreturnrequests${query.size ? `?${query.toString()}` : ""}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Không thể tải yêu cầu trả hàng");
      }

      const payload = data.payload as
        | {
            items?: unknown[];
            totalCount?: number;
            pageNumber?: number;
            pageSize?: number;
            totalPages?: number;
          }
        | unknown[]
        | null;

      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

      const normalizedItems = items.map((item) =>
        this.normalizeReturnRequest(item),
      );

      return {
        items: normalizedItems,
        totalCount:
          typeof payload === "object" &&
          payload !== null &&
          !Array.isArray(payload)
            ? Number(payload.totalCount ?? normalizedItems.length)
            : normalizedItems.length,
        pageNumber:
          typeof payload === "object" &&
          payload !== null &&
          !Array.isArray(payload)
            ? Number(payload.pageNumber ?? params?.PageNumber ?? 1)
            : Number(params?.PageNumber ?? 1),
        pageSize:
          typeof payload === "object" &&
          payload !== null &&
          !Array.isArray(payload)
            ? Number(
                payload.pageSize ?? params?.PageSize ?? normalizedItems.length,
              )
            : Number((params?.PageSize ?? normalizedItems.length) || 10),
        totalPages:
          typeof payload === "object" &&
          payload !== null &&
          !Array.isArray(payload)
            ? Number(payload.totalPages ?? 1)
            : 1,
      };
    } catch (error: any) {
      console.error("Error fetching return requests:", error);
      throw new Error(error?.message || "Không thể tải yêu cầu trả hàng");
    }
  }

  async reviewReturnRequest(
    id: string,
    body: ProcessInitialReturnDto,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/review",
        {
          params: { path: { id } },
          body,
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể duyệt yêu cầu");
      }

      return response.data.message || "Xử lý yêu cầu thành công";
    } catch (error: any) {
      console.error("Error reviewing return request:", error);
      throw new Error(error?.message || "Không thể duyệt yêu cầu");
    }
  }

  async startReturnInspection(
    id: string,
    body: StartInspectionDto,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/start-inspection",
        {
          params: { path: { id } },
          body,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể bắt đầu kiểm định",
        );
      }

      return response.data.message || "Đã bắt đầu kiểm định";
    } catch (error: any) {
      console.error("Error starting inspection:", error);
      throw new Error(error?.message || "Không thể bắt đầu kiểm định");
    }
  }

  async completeReturnInspection(
    id: string,
    body: RecordInspectionDto,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/complete-inspection",
        {
          params: { path: { id } },
          body,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể hoàn tất kiểm định",
        );
      }

      return response.data.message || "Hoàn tất kiểm định thành công";
    } catch (error: any) {
      console.error("Error completing inspection:", error);
      throw new Error(error?.message || "Không thể hoàn tất kiểm định");
    }
  }

  async failReturnInspection(
    id: string,
    body: RejectInspectionDto,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/fail-inspection",
        {
          params: { path: { id } },
          body,
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể từ chối kiểm định",
        );
      }

      return response.data.message || "Đã từ chối yêu cầu";
    } catch (error: any) {
      console.error("Error failing inspection:", error);
      throw new Error(error?.message || "Không thể từ chối kiểm định");
    }
  }

  async refundReturnRequest(id: string): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/refund",
        {
          params: { path: { id } },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể hoàn tiền");
      }

      return response.data.message || "Hoàn tiền thành công";
    } catch (error: any) {
      console.error("Error refunding return request:", error);
      throw new Error(error?.message || "Không thể hoàn tiền");
    }
  }

  async uploadTemporaryReturnImages(
    files: File[],
  ): Promise<TemporaryMediaResponse[]> {
    if (!files.length) {
      return [];
    }

    const accessToken = localStorage.getItem("accessToken");
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}/api/orderreturnrequests/images/temporary`;
    let lastErrorMessage = "Không thể tải ảnh tạm thời";

    const tryUpload = async (
      buildFormData: (fileList: File[]) => FormData,
    ): Promise<TemporaryMediaResponse[] | null> => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
        body: buildFormData(files),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        lastErrorMessage =
          data?.message ||
          (Array.isArray(data?.errors) ? data.errors.join("; ") : "") ||
          lastErrorMessage;
        return null;
      }

      const payload = data.payload as
        | { data?: TemporaryMediaResponse[] | null }
        | TemporaryMediaResponse[]
        | null;

      if (Array.isArray(payload)) {
        return payload;
      }

      return payload?.data || [];
    };

    const strategyA = await tryUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file) => {
        formData.append("Images", file);
      });
      return formData;
    });

    if (strategyA) {
      return strategyA;
    }

    const strategyB = await tryUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file, index) => {
        formData.append(`Images[${index}]`, file);
      });
      return formData;
    });

    if (strategyB) {
      return strategyB;
    }

    const strategyC = await tryUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file, index) => {
        formData.append(`Images[${index}].ImageFile`, file);
      });
      return formData;
    });

    if (strategyC) {
      return strategyC;
    }

    throw new Error(lastErrorMessage);
  }

  async createReturnRequest(payload: CreateReturnRequestDto): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/orderreturnrequests", {
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể tạo yêu cầu trả hàng",
        );
      }

      return response.data.message || "Đã tạo yêu cầu trả hàng";
    } catch (error: any) {
      console.error("Error creating return request:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Không thể tạo yêu cầu trả hàng",
      );
    }
  }

  async checkout(request: CreateOrderRequest): Promise<CheckoutResponse> {
    try {
      const response = await apiInstance.POST("/api/orders/checkout", {
        body: request,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Checkout failed");
      }

      const payload = response.data.payload as
        | string
        | { url?: string; orderId?: string }
        | null
        | undefined;

      if (typeof payload === "string") {
        const isRedirectUrl = /^https?:\/\//i.test(payload);
        return {
          url: isRedirectUrl ? payload : undefined,
          orderId: isRedirectUrl ? undefined : payload,
        };
      }

      if (payload && typeof payload === "object") {
        return {
          url: payload.url,
          orderId: payload.orderId,
        };
      }

      return {
        url: undefined,
        orderId: undefined,
      };
    } catch (error: any) {
      console.error("Error during checkout:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Checkout failed",
      );
    }
  }

  async checkoutInStore(
    request: CreateInStoreOrderRequest,
  ): Promise<CheckoutResponse> {
    try {
      const response = await apiInstance.POST("/api/orders/checkout-in-store", {
        body: request,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Checkout failed");
      }

      return {
        orderId: response.data.payload ?? undefined,
        url: undefined,
      };
    } catch (error: any) {
      console.error("Error during in-store checkout:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Checkout failed",
      );
    }
  }

  async getOrderById(orderId: string): Promise<OrderResponse> {
    try {
      const response = await apiInstance.GET("/api/orders/{orderId}", {
        params: {
          path: { orderId },
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to fetch order details",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch order details",
      );
    }
  }

  async getMyOrderById(orderId: string): Promise<OrderResponse> {
    try {
      const response = await apiInstance.GET(
        "/api/orders/my-orders/{orderId}",
        {
          params: {
            path: { orderId },
          },
        },
      );

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to fetch order details",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching my order details:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch order details",
      );
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
  ): Promise<void> {
    try {
      const response = await apiInstance.PUT("/api/orders/{orderId}/status", {
        params: {
          path: { orderId },
        },
        body: {
          status,
          note: note || null,
        },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to update order status",
        );
      }
    } catch (error: any) {
      console.error("Error updating order status:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update order status",
      );
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/orders/{orderId}/cancel", {
        params: {
          path: { orderId },
        },
        body: {
          reason: reason ?? null,
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to cancel order");
      }

      return response.data.message || "Order canceled successfully";
    } catch (error: any) {
      console.error("Error canceling order:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to cancel order",
      );
    }
  }

  async fulfillOrder(
    orderId: string,
    payload: FulfillOrderRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/orders/{orderId}/fulfill", {
        params: {
          path: { orderId },
        },
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fulfill order");
      }

      return response.data.message || "Order fulfilled successfully";
    } catch (error: any) {
      console.error("Error fulfilling order:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fulfill order",
      );
    }
  }

  async retryPayment(
    paymentId: string,
    method: PaymentMethod,
  ): Promise<CheckoutResponse> {
    try {
      const response = await apiInstance.POST(
        "/api/payments/{paymentId}/retry",
        {
          params: {
            path: {
              paymentId,
            },
          },
          body: {
            method,
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to retry payment");
      }

      // Return URL for redirect payment or orderId for cash payment
      return {
        url: response.data.payload ?? undefined,
        orderId: response.data.payload ?? undefined,
      };
    } catch (error: any) {
      console.error("Error retrying payment:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to retry payment",
      );
    }
  }

  async confirmPayment(
    paymentId: string,
    isSuccess: boolean,
    failureReason?: string,
  ): Promise<boolean> {
    try {
      const response = await apiInstance.PUT(
        "/api/payments/{paymentId}/confirm",
        {
          params: {
            path: { paymentId },
          },
          body: {
            isSuccess,
            failureReason,
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to confirm payment");
      }

      return Boolean(response.data.payload);
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to confirm payment",
      );
    }
  }
}

export const orderService = new OrderService();
