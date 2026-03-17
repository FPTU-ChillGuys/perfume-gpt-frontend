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

interface FulfillOrderItemRequest {
  orderDetailId: string;
  scannedBatchCode: string;
  quantity: number;
}

interface FulfillOrderRequest {
  items: FulfillOrderItemRequest[];
}

class OrderService {
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
      const response = await apiInstance.POST(
        "/api/orders/checkout-in-store",
        {
          body: request,
        },
      );

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
        error.response?.data?.message ||
          error.message ||
          "Checkout failed",
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

  async cancelOrder(orderId: string): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/orders/{orderId}/cancel", {
        params: {
          path: { orderId },
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
        "/api/payments/retry/{paymentId}",
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
        throw new Error(
          response.data?.message || "Failed to retry payment",
        );
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
        "/api/payments/confirm/{paymentId}",
        {
          params: {
            path: { paymentId },
            query: {
              isSuccess,
              failureReason,
            },
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
