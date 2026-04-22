import { apiInstance } from "@/lib/api";
import type { CartItem, CartTotals } from "@/types/cart";

interface VoucherQuery {
  VoucherCode?: string;
  ItemIds?: string[];
  SavedAddressId?: string;
  "Recipient.DistrictId"?: number;
  "Recipient.WardCode"?: string;
}

const DEFAULT_TOTALS: CartTotals = {
  subtotal: 0,
  shippingFee: 0,
  discount: 0,
  totalPrice: 0,
  responseMessage: undefined,
};

const PROMOTION_WARNING_REGEX =
  /not in promotion|khong.*khuyen mai|không.*khuyến mãi/i;

class CartService {
  private readonly ITEMS_ENDPOINT = "/api/cart/items";
  private readonly TOTAL_ENDPOINT = "/api/cart/total";
  private readonly CLEAR_ENDPOINT = "/api/cart/clear";
  private readonly ADD_TO_CART_ENDPOINT = "/api/cart/items";

  async getCartWithTotals(
    voucherId?: string,
    itemIds?: string[],
    districtId?: number,
    wardCode?: string,
    savedAddressId?: string,
  ): Promise<{
    items: CartItem[];
    totals: CartTotals;
  }> {
    try {
      // Lấy items và totals từ API
      const items = await this.getItems();
      const totals = await this.getTotals(
        voucherId,
        itemIds,
        districtId,
        wardCode,
        savedAddressId,
      );

      return {
        items,
        totals,
      };
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch cart",
      );
    }
  }

  async getItems(): Promise<CartItem[]> {
    try {
      const response = await apiInstance.GET(this.ITEMS_ENDPOINT);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch cart items");
      }

      const items = response.data.payload?.items ?? [];

      return items;
    } catch (error: any) {
      console.error("Error fetching cart items:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch cart items",
      );
    }
  }

  async getCartItemCount(): Promise<number> {
    try {
      const items = await this.getItems();
      // Tính tổng quantity của tất cả items
      return items.reduce((total, item) => total + (item.quantity ?? 0), 0);
    } catch (error: any) {
      console.error("Error fetching cart item count:", error);
      return 0;
    }
  }

  async getTotals(
    voucherId?: string,
    itemIds?: string[],
    districtId?: number,
    wardCode?: string,
    savedAddressId?: string,
  ): Promise<CartTotals> {
    try {
      const query = this.buildQuery(
        voucherId,
        itemIds,
        districtId,
        wardCode,
        savedAddressId,
      );
      const response = await apiInstance.GET(this.TOTAL_ENDPOINT, {
        params: query ? { query } : undefined,
      });

      // OpenAPI-fetch: Check for HTTP errors (400, 500, etc.)
      if (response.error) {
        // Extract message from error response (for 400 Bad Request, etc.)
        const errorMessage = (response.error as any)?.message || "Failed to fetch cart totals";
        throw new Error(errorMessage);
      }

      const payload = response.data?.payload;
      const rawMessage = (response.data?.message || "").trim();
      const warningMessage = PROMOTION_WARNING_REGEX.test(rawMessage)
        ? rawMessage
        : undefined;

      if (payload) {
        return {
          subtotal: Number(
            (payload as { subtotal?: number; subTotal?: number }).subtotal ??
              (payload as { subTotal?: number }).subTotal ??
              0,
          ),
          shippingFee: Number(payload.shippingFee ?? 0),
          discount: Number(payload.discount ?? 0),
          totalPrice: Number(
            (payload as { totalPrice?: number; total?: number }).totalPrice ??
              (payload as { total?: number }).total ??
              0,
          ),
          warningMessage,
          responseMessage: rawMessage || undefined,
        };
      }

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch cart totals",
        );
      }

      return DEFAULT_TOTALS;
    } catch (error: any) {
      console.error("Error fetching cart totals:", error);
      console.error("Error response structure:", {
        response: error.response,
        data: error.data,
        message: error.message,
        fullError: error
      });
      // Ưu tiên message từ response 400 cho voucher errors
      const serverMessage = 
        error.response?.data?.message || 
        error.data?.message || 
        (error.response && typeof error.response === 'object' && error.response.message) ||
        error.message;
      
      throw new Error(
        serverMessage || "Failed to fetch cart totals"
      );
    }
  }

  async addItem(variantId: string, quantity: number) {
    const response = await apiInstance.POST(this.ADD_TO_CART_ENDPOINT, {
      body: { variantId, quantity },
    });

    // openapi-fetch returns 4xx/5xx as response.error (not a thrown exception)
    if (response.error) {
      const serverMessage =
        (response.error as { message?: string })?.message ||
        "Không thể thêm sản phẩm vào giỏ hàng";
      throw new Error(serverMessage);
    }

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Không thể thêm sản phẩm vào giỏ hàng",
      );
    }
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    const response = await apiInstance.PUT(`/api/cart/items/{id}`, {
      params: {
        path: {
          id: cartItemId,
        },
      },
      body: { quantity },
    });

    // openapi-fetch returns 4xx/5xx as response.error (not a thrown exception)
    if (response.error) {
      const serverMessage =
        (response.error as { message?: string })?.message ||
        "Không thể cập nhật số lượng";
      throw new Error(serverMessage);
    }

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Không thể cập nhật số lượng");
    }
  }

  async removeCartItem(cartItemId: string) {
    try {
      const response = await apiInstance.DELETE(`/api/cart/items/{id}`, {
        params: {
          path: {
            id: cartItemId,
          },
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to remove cart item");
      }
    } catch (error: any) {
      console.error("Error removing cart item:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to remove cart item",
      );
    }
  }

  async clearCart() {
    try {
      const response = await apiInstance.DELETE(this.CLEAR_ENDPOINT);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to clear cart");
      }
    } catch (error: any) {
      console.error("Error clearing cart:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to clear cart",
      );
    }
  }

  private buildQuery(
    voucherId?: string,
    itemIds?: string[],
    districtId?: number,
    wardCode?: string,
    savedAddressId?: string,
  ): VoucherQuery | undefined {
    const query: VoucherQuery = {};

    if (voucherId) {
      query.VoucherCode = voucherId;
    }

    if (itemIds && itemIds.length > 0) {
      query.ItemIds = itemIds;
    }

    if (savedAddressId) {
      query.SavedAddressId = savedAddressId;
    }

    if (typeof districtId === "number" && districtId > 0) {
      query["Recipient.DistrictId"] = districtId;
    }

    if (wardCode && wardCode.trim()) {
      query["Recipient.WardCode"] = wardCode.trim();
    }

    return Object.keys(query).length > 0 ? query : undefined;
  }
}

export const cartService = new CartService();
