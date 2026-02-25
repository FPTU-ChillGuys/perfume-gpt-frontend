import { apiInstance } from "@/lib/api";
import type {
  OrderListItem,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from "@/types/order";
import type { CreateOrderRequest, CheckoutResponse } from "@/types/checkout";

interface GetMyOrdersParams {
  Status?: OrderStatus;
  Type?: OrderType;
  PaymentStatus?: PaymentStatus;
  FromDate?: string;
  ToDate?: string;
  SearchTerm?: string;
  PageNumber?: number;
  PageSize?: number;
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
}

export const orderService = new OrderService();
