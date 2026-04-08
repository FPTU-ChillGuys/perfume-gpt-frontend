import { apiInstance } from "@/lib/api";
import { getStoredAccessToken } from "@/utils/authStorage";
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

const normalizeBaseUrl = (value?: string) =>
  (value || "").trim().replace(/\/+$/, "");

const resolveDirectApiBaseUrl = () => {
  const configured = normalizeBaseUrl(
    import.meta.env.VITE_API_BASE_URL as string | undefined,
  );

  if (typeof window !== "undefined") {
    const isProductionHost =
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    // On deployed frontend, prefer same-origin `/api/*` so platform rewrites/proxies handle CORS.
    if (isProductionHost) {
      return "";
    }
  }

  return configured;
};

const DIRECT_API_BASE_URL = resolveDirectApiBaseUrl();

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
export type ProcessCancelRequestBody = Omit<
  components["schemas"]["ProcessCancelRequest"],
  "refundMethod"
> & {
  refundMethod?: PaymentMethod | null;
  manualTransactionReference?: string | null;
};

export interface PagedCancelRequests {
  items: OrderCancelRequest[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export type CreateReturnRequestDto =
  components["schemas"]["CreateReturnRequestDto"];
export type ReturnOrderReason = components["schemas"]["ReturnOrderReason"];
export type CancelOrderReason = components["schemas"]["CancelOrderReason"];
export type ContactAddressInformation =
  components["schemas"]["ContactAddressInformation"];
export interface CreateReturnRequestPayload {
  orderId: string;
  reason: ReturnOrderReason;
  isRefundOnly?: boolean;
  returnItems: {
    orderDetailId: string;
    quantity: number;
  }[];
  customerNote?: string | null;
  refundBankName?: string | null;
  refundAccountNumber?: string | null;
  refundAccountName?: string | null;
  savedAddressId?: string | null;
  recipient?: ContactAddressInformation | null;
  temporaryMediaIds?: string[] | null;
}
export type TemporaryMediaResponse =
  components["schemas"]["TemporaryMediaResponse"];
export type UpdateReturnRequestDto =
  components["schemas"]["UpdateReturnRequestDto"];
export type ProcessInitialReturnDto =
  components["schemas"]["ProcessInitialReturnDto"];
export type StartInspectionDto = components["schemas"]["StartInspectionDto"];
export type RecordInspectionDto = components["schemas"]["RecordInspectionDto"];
export type RejectInspectionDto = components["schemas"]["RejectInspectionDto"];
export type PickListResponse = components["schemas"]["PickListResponse"];
export type PickListItemResponse =
  components["schemas"]["PickListItemResponse"];
export type PickListBatchInfo = components["schemas"]["PickListBatchInfo"];
export type SwapDamagedStockRequest =
  components["schemas"]["SwapDamagedStockRequest"];
export type SwapDamagedStockResponse =
  components["schemas"]["SwapDamagedStockResponse"];
export type ReturnRefundMethod = Extract<
  PaymentMethod,
  "VnPay" | "Momo" | "CashInStore" | "ExternalBankTransfer"
>;

export type ReturnRequestStatus =
  | "Pending"
  | "RequestMoreInfo"
  | "ApprovedForReturn"
  | "Inspecting"
  | "ReadyForRefund"
  | "Rejected"
  | "Completed"
  | "Refunded"
  | string;

export interface ProofImage {
  id?: string;
  url?: string;
  altText?: string | null;
  displayOrder?: number;
  isPrimary?: boolean;
  mimeType?: string | null;
}

export interface ReturnShippingInfo {
  id?: string;
  carrierName?: string | null;
  trackingNumber?: string | null;
  type?: string | null;
  shippingFee?: number;
  status?: string | null;
  estimatedDeliveryDate?: string | null;
  shippedDate?: string | null;
}

export interface ReturnRequestDetail {
  id?: string;
  orderDetailId?: string;
  variantId?: string;
  requestedQuantity?: number;
  unitPrice?: number;
  refundableAmount?: number;
}

export interface OrderReturnRequest {
  id?: string;
  orderId?: string;
  orderCode: string;
  customerId?: string;
  requestedByEmail?: string | null;
  processedByName?: string | null;
  inspectedByName?: string | null;
  reason?: string | null;
  customerNote?: string | null;
  refundBankName?: string | null;
  refundAccountNumber?: string | null;
  refundAccountName?: string | null;
  staffNote?: string | null;
  inspectionNote?: string | null;
  status?: ReturnRequestStatus;
  requestedRefundAmount?: number;
  approvedRefundAmount?: number;
  isRefunded?: boolean;
  isRestocked?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  returnDetails?: ReturnRequestDetail[];
  proofImages?: ProofImage[];
  returnShippingInfo?: ReturnShippingInfo;
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

  private normalizeProofImage(img: unknown): ProofImage {
    return {
      id: this.getValue<string>(img, ["id", "Id"]),
      url: this.getValue<string>(img, ["url", "Url"]),
      altText:
        this.getValue<string | null>(img, ["altText", "AltText"]) ?? null,
      displayOrder: Number(
        this.getValue<number>(img, ["displayOrder", "DisplayOrder"]) ?? 0,
      ),
      isPrimary: Boolean(
        this.getValue<boolean>(img, ["isPrimary", "IsPrimary"]),
      ),
      mimeType:
        this.getValue<string | null>(img, ["mimeType", "MimeType"]) ?? null,
    };
  }

  private normalizeReturnShippingInfo(info: unknown): ReturnShippingInfo {
    return {
      id: this.getValue<string>(info, ["id", "Id"]),
      carrierName:
        this.getValue<string | null>(info, ["carrierName", "CarrierName"]) ??
        null,
      trackingNumber:
        this.getValue<string | null>(info, [
          "trackingNumber",
          "TrackingNumber",
        ]) ?? null,
      type: this.getValue<string | null>(info, ["type", "Type"]) ?? null,
      shippingFee: Number(
        this.getValue<number>(info, ["shippingFee", "ShippingFee"]) ?? 0,
      ),
      status: this.getValue<string | null>(info, ["status", "Status"]) ?? null,
      estimatedDeliveryDate:
        this.getValue<string | null>(info, [
          "estimatedDeliveryDate",
          "EstimatedDeliveryDate",
        ]) ?? null,
      shippedDate:
        this.getValue<string | null>(info, ["shippedDate", "ShippedDate"]) ??
        null,
    };
  }

  private normalizeReturnRequest(item: unknown): OrderReturnRequest {
    const rawProofImages =
      this.getValue<unknown[]>(item, ["proofImages", "ProofImages"]) || [];
    const rawReturnDetails =
      this.getValue<unknown[]>(item, ["returnDetails", "ReturnDetails"]) || [];
    const rawReturnShippingInfo = this.getValue<unknown>(item, [
      "returnShippingInfo",
      "ReturnShippingInfo",
    ]);

    return {
      id: this.getValue<string>(item, ["id", "Id"]),
      orderId: this.getValue<string>(item, ["orderId", "OrderId"]),
      orderCode: this.getValue<string>(item, ["orderCode", "OrderCode"]) || "",
      customerId: this.getValue<string>(item, ["customerId", "CustomerId"]),
      requestedByEmail:
        this.getValue<string | null>(item, [
          "requestedByEmail",
          "RequestedByEmail",
          "customerEmail",
          "CustomerEmail",
        ]) ?? null,
      processedByName:
        this.getValue<string | null>(item, [
          "processedByName",
          "ProcessedByName",
        ]) ?? null,
      inspectedByName:
        this.getValue<string | null>(item, [
          "inspectedByName",
          "InspectedByName",
        ]) ?? null,
      reason: this.getValue<string | null>(item, ["reason", "Reason"]) ?? null,
      customerNote:
        this.getValue<string | null>(item, ["customerNote", "CustomerNote"]) ??
        null,
      refundBankName:
        this.getValue<string | null>(item, [
          "refundBankName",
          "RefundBankName",
        ]) ?? null,
      refundAccountNumber:
        this.getValue<string | null>(item, [
          "refundAccountNumber",
          "RefundAccountNumber",
        ]) ?? null,
      refundAccountName:
        this.getValue<string | null>(item, [
          "refundAccountName",
          "RefundAccountName",
        ]) ?? null,
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
      isRefunded: Boolean(
        this.getValue<boolean>(item, ["isRefunded", "IsRefunded"]),
      ),
      isRestocked: Boolean(
        this.getValue<boolean>(item, ["isRestocked", "IsRestocked"]),
      ),
      createdAt:
        this.getValue<string>(item, ["createdAt", "CreatedAt"]) ||
        new Date().toISOString(),
      updatedAt:
        this.getValue<string | null>(item, ["updatedAt", "UpdatedAt"]) ?? null,
      returnDetails: rawReturnDetails.map((detail) => ({
        id: this.getValue<string>(detail, ["id", "Id"]),
        orderDetailId: this.getValue<string>(detail, [
          "orderDetailId",
          "OrderDetailId",
        ]),
        variantId: this.getValue<string>(detail, ["variantId", "VariantId"]),
        requestedQuantity: Number(
          this.getValue<number>(detail, [
            "requestedQuantity",
            "RequestedQuantity",
          ]) ?? 0,
        ),
        unitPrice: Number(
          this.getValue<number>(detail, ["unitPrice", "UnitPrice"]) ?? 0,
        ),
        refundableAmount: Number(
          this.getValue<number>(detail, [
            "refundableAmount",
            "RefundableAmount",
          ]) ?? 0,
        ),
      })),
      proofImages: rawProofImages.map((img) => this.normalizeProofImage(img)),
      returnShippingInfo: rawReturnShippingInfo
        ? this.normalizeReturnShippingInfo(rawReturnShippingInfo)
        : undefined,
    };
  }

  private normalizeOrderListItem(item: unknown): OrderListItem {
    const fallbackId = this.getValue<string>(item, [
      "id",
      "Id",
      "orderId",
      "OrderId",
    ]);

    const fallbackCode = this.getValue<string>(item, [
      "code",
      "Code",
      "orderCode",
      "OrderCode",
    ]);

    const rawOrderDetails =
      this.getValue<unknown[]>(item, ["orderDetails", "OrderDetails"]) || [];

    const orderDetails = rawOrderDetails.map((detail) => ({
      ...(detail as components["schemas"]["OrderDetailListItem"]),
      id: this.getValue<string>(detail, ["id", "Id"]),
      variantId: this.getValue<string>(detail, ["variantId", "VariantId"]),
      variantName:
        this.getValue<string>(detail, ["variantName", "VariantName"]) || "",
      imageUrl:
        this.getValue<string | null>(detail, ["imageUrl", "ImageUrl"]) ?? null,
      quantity: Number(
        this.getValue<number>(detail, ["quantity", "Quantity"]) ?? 0,
      ),
      unitPrice: Number(
        this.getValue<number>(detail, ["unitPrice", "UnitPrice"]) ?? 0,
      ),
      total: Number(this.getValue<number>(detail, ["total", "Total"]) ?? 0),
    }));

    return {
      ...(item as OrderListItem),
      id: fallbackId,
      code: fallbackCode || fallbackId || "",
      orderDetails,
    };
  }

  private normalizeOrderResponse(item: unknown): OrderResponse {
    const fallbackId = this.getValue<string>(item, [
      "id",
      "Id",
      "orderId",
      "OrderId",
    ]);

    const fallbackCode = this.getValue<string>(item, [
      "code",
      "Code",
      "orderCode",
      "OrderCode",
    ]);

    return {
      ...(item as OrderResponse),
      id: fallbackId,
      code: fallbackCode || fallbackId || "",
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

      const items = (response.data.payload.items || []).map((item) =>
        this.normalizeOrderListItem(item),
      );

      return {
        items,
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

      const payload = response.data.payload;
      return {
        ...payload,
        items: (payload.items || []).map((item) =>
          this.normalizeOrderListItem(item),
        ),
      };
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

  async getMyCancelRequests(
    params?: GetOrderCancelRequestsParams,
  ): Promise<PagedCancelRequests> {
    try {
      const response = await apiInstance.GET(
        "/api/ordercancelrequests/my-requests",
        {
          params: {
            query: params,
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to load my cancel requests",
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
      console.error("Error fetching my cancel requests:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load my cancel requests",
      );
    }
  }

  async getCancelRequestById(id: string): Promise<OrderCancelRequest> {
    try {
      const response = await apiInstance.GET("/api/ordercancelrequests/{id}", {
        params: {
          path: { id },
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to load cancel request detail",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching cancel request detail:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to load cancel request detail",
      );
    }
  }

  async processCancelRequest(
    id: string,
    body: ProcessCancelRequestBody,
  ): Promise<string> {
    try {
      const requestBody = {
        ...body,
        refundMethod: body.refundMethod ?? undefined,
      };

      const response = await apiInstance.POST(
        "/api/ordercancelrequests/{id}/process",
        {
          params: { path: { id } },
          body: requestBody,
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

      const accessToken = getStoredAccessToken();
      const endpoint = `${DIRECT_API_BASE_URL}/api/orderreturnrequests${query.size ? `?${query.toString()}` : ""}`;
      const requestHeaders: HeadersInit = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      let response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        headers: requestHeaders,
      });

      if (response.status === 304) {
        let retryUrl = `${endpoint}${endpoint.includes("?") ? "&" : "?"}_ts=${Date.now()}`;

        try {
          if (typeof window !== "undefined") {
            const parsed = new URL(endpoint, window.location.origin);
            parsed.searchParams.set("_ts", Date.now().toString());
            retryUrl = parsed.toString();
          }
        } catch {
          // keep fallback retryUrl
        }

        response = await fetch(retryUrl, {
          method: "GET",
          cache: "no-store",
          headers: requestHeaders,
        });
      }

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
            sortBy?: string;
            sortOrder?: string;
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

  async getMyReturnRequests(
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

      const accessToken = getStoredAccessToken();
      const endpoint = `${DIRECT_API_BASE_URL}/api/orderreturnrequests/my-requests${query.size ? `?${query.toString()}` : ""}`;
      const requestHeaders: HeadersInit = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      let response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        headers: requestHeaders,
      });

      if (response.status === 304) {
        let retryUrl = `${endpoint}${endpoint.includes("?") ? "&" : "?"}_ts=${Date.now()}`;

        try {
          if (typeof window !== "undefined") {
            const parsed = new URL(endpoint, window.location.origin);
            parsed.searchParams.set("_ts", Date.now().toString());
            retryUrl = parsed.toString();
          }
        } catch {
          // keep fallback retryUrl
        }

        response = await fetch(retryUrl, {
          method: "GET",
          cache: "no-store",
          headers: requestHeaders,
        });
      }

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Không thể tải yêu cầu trả hàng của bạn",
        );
      }

      const payload = data.payload as
        | {
            items?: unknown[];
            totalCount?: number;
            pageNumber?: number;
            pageSize?: number;
            totalPages?: number;
            sortBy?: string;
            sortOrder?: string;
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
      console.error("Error fetching my return requests:", error);
      throw new Error(error?.message || "Không thể tải yêu cầu trả hàng");
    }
  }

  async reviewReturnRequest(
    id: string,
    body: ProcessInitialReturnDto,
  ): Promise<string> {
    try {
      const { data, error, response } = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/review",
        {
          params: { path: { id } },
          body,
        },
      );

      if (error) {
        throw new Error((error as any)?.message || "Không thể duyệt yêu cầu");
      }

      if (!data?.success) {
        throw new Error(data?.message || "Không thể duyệt yêu cầu");
      }

      return data.message || "Xử lý yêu cầu thành công";
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
      const { data, error, response } = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/start-inspection",
        {
          params: { path: { id } },
          body,
        },
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Không thể bắt đầu kiểm định",
        );
      }

      if (!data?.success) {
        throw new Error(data?.message || "Không thể bắt đầu kiểm định");
      }

      return data.message || "Đã bắt đầu kiểm định";
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
      const { data, error, response } = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/complete-inspection",
        {
          params: { path: { id } },
          body,
        },
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Không thể hoàn tất kiểm định",
        );
      }

      if (!data?.success) {
        throw new Error(data?.message || "Không thể hoàn tất kiểm định");
      }

      return data.message || "Hoàn tất kiểm định thành công";
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
      const { data, error, response } = await apiInstance.POST(
        "/api/orderreturnrequests/{id}/fail-inspection",
        {
          params: { path: { id } },
          body,
        },
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Không thể từ chối kiểm định",
        );
      }

      if (!data?.success) {
        throw new Error(data?.message || "Không thể từ chối kiểm định");
      }

      return data.message || "Đã từ chối yêu cầu";
    } catch (error: any) {
      console.error("Error failing inspection:", error);
      throw new Error(error?.message || "Không thể từ chối kiểm định");
    }
  }

  async getReturnRequestById(id: string): Promise<OrderReturnRequest> {
    try {
      const { data, error, response } = await apiInstance.GET(
        "/api/orderreturnrequests/{id}",
        {
          params: { path: { id } },
        },
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Không thể tải chi tiết yêu cầu trả hàng",
        );
      }

      if (!data?.success || !data.payload) {
        throw new Error(
          data?.message || "Không thể tải chi tiết yêu cầu trả hàng",
        );
      }

      return this.normalizeReturnRequest(data.payload);
    } catch (error: any) {
      console.error("Error fetching return request by ID:", error);
      throw new Error(
        error?.message || "Không thể tải chi tiết yêu cầu trả hàng",
      );
    }
  }

  async updateReturnRequest(
    id: string,
    body: UpdateReturnRequestDto,
  ): Promise<string> {
    try {
      const { data, error } = await apiInstance.PUT(
        "/api/orderreturnrequests/{id}",
        {
          params: { path: { id } },
          body,
        },
      );

      if (error) {
        throw new Error(
          (error as any)?.message || "Không thể cập nhật yêu cầu trả hàng",
        );
      }

      if (!data?.success) {
        throw new Error(data?.message || "Không thể cập nhật yêu cầu trả hàng");
      }

      return data.message || "Cập nhật yêu cầu trả hàng thành công";
    } catch (error: any) {
      console.error("Error updating return request:", error);
      throw new Error(error?.message || "Không thể cập nhật yêu cầu trả hàng");
    }
  }

  async refundReturnRequest(
    id: string,
    refundMethod: ReturnRefundMethod,
    manualTransactionReference?: string | null,
    note?: string | null,
  ): Promise<string> {
    try {
      const accessToken = getStoredAccessToken();
      const endpoint = `${DIRECT_API_BASE_URL}/api/orderreturnrequests/${id}/refund`;

      const requestBody: Record<string, string> = {
        refundMethod,
      };

      const trimmedManualReference = manualTransactionReference?.trim();
      if (trimmedManualReference) {
        requestBody.manualTransactionReference = trimmedManualReference;
      }

      const trimmedNote = note?.trim();
      if (trimmedNote) {
        requestBody.note = trimmedNote;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {}),
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        const message = data?.message || "Không thể hoàn tiền";

        // Gateway refunds can return conflict-style errors while another attempt is processing.
        if (
          response.status === 409 ||
          /xung đột|conflict|đang xử lý giao dịch/i.test(String(message))
        ) {
          throw new Error(
            `${message} Vui lòng chờ trong giây lát rồi thử lại để tránh gửi trùng yêu cầu hoàn tiền.`,
          );
        }

        throw new Error(message);
      }

      return data.message || "Hoàn tiền thành công";
    } catch (error: any) {
      console.error("Error refunding return request:", error);
      throw new Error(error?.message || "Không thể hoàn tiền");
    }
  }

  async uploadTemporaryReturnMedia(
    files: File[],
  ): Promise<TemporaryMediaResponse[]> {
    if (!files.length) {
      return [];
    }

    const accessToken = getStoredAccessToken();
    const endpoint = `${DIRECT_API_BASE_URL}/api/orderreturnrequests/videos/temporary`;
    let lastErrorMessage = "Không thể tải tệp đính kèm tạm thời";

    const tryUpload = async (
      buildFormData: (fileList: File[]) => FormData,
      endpointUrl = endpoint,
    ): Promise<TemporaryMediaResponse[] | null> => {
      const response = await fetch(endpointUrl, {
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
        formData.append("Videos", file);
      });
      return formData;
    });

    if (strategyA) {
      return strategyA;
    }

    const strategyB = await tryUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file, index) => {
        formData.append(`Videos[${index}]`, file);
      });
      return formData;
    });

    if (strategyB) {
      return strategyB;
    }

    const strategyC = await tryUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file, index) => {
        formData.append(`Videos[${index}].VideoFile`, file);
      });
      return formData;
    });

    if (strategyC) {
      return strategyC;
    }

    // Backward-compatible fallback for older return media endpoint contracts.
    const fallbackEndpoint = `${DIRECT_API_BASE_URL}/api/orderreturnrequests/images/temporary`;
    const fallback = await tryUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file) => {
        formData.append("Images", file);
      });
      return formData;
    }, fallbackEndpoint);

    if (fallback) {
      return fallback;
    }

    throw new Error(lastErrorMessage);
  }

  async uploadTemporaryReturnImages(
    files: File[],
  ): Promise<TemporaryMediaResponse[]> {
    return this.uploadTemporaryReturnMedia(files);
  }

  async createReturnRequest(
    payload: CreateReturnRequestPayload,
  ): Promise<string> {
    try {
      const requestBody: CreateReturnRequestDto = {
        orderId: payload.orderId,
        reason: payload.reason,
        isRefundOnly: payload.isRefundOnly ?? false,
        returnItems: payload.returnItems,
        customerNote: payload.customerNote ?? null,
        refundBankName: payload.refundBankName ?? null,
        refundAccountNumber: payload.refundAccountNumber ?? null,
        refundAccountName: payload.refundAccountName ?? null,
        savedAddressId: payload.savedAddressId ?? null,
        recipient: payload.recipient ?? null,
        temporaryMediaIds: payload.temporaryMediaIds ?? null,
      };

      const response = await apiInstance.POST("/api/orderreturnrequests", {
        body: requestBody,
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
        orderId: undefined,
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

      return this.normalizeOrderResponse(response.data.payload);
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

      return this.normalizeOrderResponse(response.data.payload);
    } catch (error: any) {
      console.error("Error fetching my order details:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch order details",
      );
    }
  }

  async syncMyShippingStatus(): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/shippings/me/sync-shipping-status",
        {},
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to sync shipping status",
        );
      }

      return response.data.message || "Shipping status synced successfully";
    } catch (error: any) {
      console.error("Error syncing shipping status:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to sync shipping status",
      );
    }
  }

  async syncShippingStatusByUserId(userId: string): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/shippings/user/{userId}/sync-shipping-status",
        {
          params: {
            path: { userId },
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to sync shipping status",
        );
      }

      return response.data.message || "Shipping status synced successfully";
    } catch (error: any) {
      console.error("Error syncing shipping status by user id:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to sync shipping status",
      );
    }
  }

  async getShippingOrderInfoUrl(trackingNumbers: string[]): Promise<string> {
    const normalizedTrackingNumbers = trackingNumbers
      .map((tracking) => tracking.trim())
      .filter(Boolean);

    if (!normalizedTrackingNumbers.length) {
      throw new Error("Không có mã vận đơn để in phiếu");
    }

    try {
      const response = await apiInstance.POST("/api/shippings/order-info-url", {
        body: {
          trackingNumbers: normalizedTrackingNumbers,
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Không lấy được link in phiếu",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error getting shipping order info URL:", error);
      throw new Error(
        error?.response?.data?.message ||
          error?.message ||
          "Không lấy được link in phiếu",
      );
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
  ): Promise<void> {
    // Backward-compatible wrapper for old callers.
    if (status === "Preparing") {
      await this.staffPrepareOrder(orderId);
      return;
    }

    if (status === "Cancelled") {
      await this.staffCancelOrder(orderId, "ChangedMind", note);
      return;
    }

    throw new Error(
      "Trạng thái này không thể cập nhật thủ công với schema hiện tại",
    );
  }

  async staffPrepareOrder(orderId: string): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/orders/{orderId}/staff-prepare",
        {
          params: {
            path: { orderId },
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to prepare order");
      }

      return response.data.message || "Order prepared successfully";
    } catch (error: any) {
      console.error("Error preparing order:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to prepare order",
      );
    }
  }

  async staffCancelOrder(
    orderId: string,
    reason: CancelOrderReason,
    note?: string,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/orders/{orderId}/staff-cancel",
        {
          params: {
            path: { orderId },
          },
          body: {
            reason,
            note: note || null,
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to cancel order");
      }

      return response.data.message || "Order canceled successfully";
    } catch (error: any) {
      console.error("Error canceling order by staff:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to cancel order",
      );
    }
  }

  async getOrderPickList(orderId: string): Promise<PickListResponse> {
    try {
      const response = await apiInstance.GET("/api/orders/{orderId}/picklist", {
        params: {
          path: { orderId },
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to get order picklist",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error getting order picklist:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to get order picklist",
      );
    }
  }

  async swapDamagedOrderReservation(
    orderId: string,
    payload: SwapDamagedStockRequest,
  ): Promise<SwapDamagedStockResponse> {
    try {
      const response = await apiInstance.POST(
        "/api/orders/{orderId}/swap-damaged",
        {
          params: {
            path: { orderId },
          },
          body: payload,
        },
      );

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to swap damaged reservation",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error swapping damaged reservation:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to swap damaged reservation",
      );
    }
  }

  async cancelOrder(
    orderId: string,
    reason?: CancelOrderReason,
    refundInfo?: {
      refundBankName?: string | null;
      refundAccountNumber?: string | null;
      refundAccountName?: string | null;
    },
  ): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/orders/{orderId}/cancel", {
        params: {
          path: { orderId },
        },
        body: {
          reason: reason || undefined,
          refundBankName: refundInfo?.refundBankName ?? null,
          refundAccountNumber: refundInfo?.refundAccountNumber ?? null,
          refundAccountName: refundInfo?.refundAccountName ?? null,
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
    posSessionId?: string,
    debugCallId?: string,
  ): Promise<CheckoutResponse> {
    try {
      const retryRequestPayload = {
        method,
        posSessionId: posSessionId || null,
      };

      console.log("[OrderService][retryPayment] request", {
        debugCallId: debugCallId || null,
        paymentId,
        payload: retryRequestPayload,
      });

      const response = await apiInstance.POST(
        "/api/payments/{paymentId}/retry",
        {
          params: {
            path: {
              paymentId,
            },
          },
          body: retryRequestPayload,
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to retry payment");
      }

      const payload = response.data.payload as
        | string
        | {
            url?: string;
            orderId?: string;
            paymentId?: string;
            paymentUrl?: string;
            Url?: string;
            OrderId?: string;
            PaymentId?: string;
            PaymentUrl?: string;
          }
        | null
        | undefined;

      if (typeof payload === "string") {
        const normalized = payload.trim();
        const isRedirectUrl = /^https?:\/\//i.test(normalized);

        const parsed = {
          url: isRedirectUrl ? normalized : undefined,
          orderId: isRedirectUrl ? undefined : normalized,
          paymentId: isRedirectUrl ? undefined : normalized,
        };

        console.log("[OrderService][retryPayment] response", {
          debugCallId: debugCallId || null,
          rawPayload: payload,
          parsed,
        });

        return parsed;
      }

      if (payload && typeof payload === "object") {
        const parsed = {
          url:
            payload.url ||
            payload.paymentUrl ||
            payload.Url ||
            payload.PaymentUrl,
          orderId: payload.orderId || payload.OrderId,
          paymentId: payload.paymentId || payload.PaymentId,
        };

        console.log("[OrderService][retryPayment] response", {
          debugCallId: debugCallId || null,
          rawPayload: payload,
          parsed,
        });

        return parsed;
      }

      console.log("[OrderService][retryPayment] response", {
        debugCallId: debugCallId || null,
        rawPayload: payload,
        parsed: {
          url: undefined,
          orderId: undefined,
          paymentId: undefined,
        },
      });

      return {
        url: undefined,
        orderId: undefined,
        paymentId: undefined,
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
    debugCallId?: string,
  ): Promise<boolean> {
    try {
      const confirmPayload = {
        isSuccess,
        failureReason,
      };

      console.log("[OrderService][confirmPayment] request", {
        debugCallId: debugCallId || null,
        paymentId,
        payload: confirmPayload,
      });

      const response = await apiInstance.PUT(
        "/api/payments/{paymentId}/confirm",
        {
          params: {
            path: { paymentId },
          },
          body: confirmPayload,
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to confirm payment");
      }

      const parsed = Boolean(response.data.payload);

      console.log("[OrderService][confirmPayment] response", {
        debugCallId: debugCallId || null,
        paymentId,
        success: parsed,
      });

      return parsed;
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
