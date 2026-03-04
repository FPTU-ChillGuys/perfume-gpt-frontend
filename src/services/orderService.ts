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

      // If payment is VnPay or Momo, response.data.payload will be the payment URL
      // If payment is CashOnDelivery or CashInStore, payload might be orderId
      return {
        url: response.data.payload ?? undefined,
        orderId: response.data.payload ?? undefined,
      };
    } catch (error: any) {
      console.error("Error during checkout:", error);
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
}

export const orderService = new OrderService();
