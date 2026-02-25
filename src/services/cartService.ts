import { apiInstance } from "@/lib/api";
import type { CartItem, CartTotals } from "@/types/cart";

interface VoucherQuery {
  VoucherCode?: string;
  DistrictId?: number | null;
  WardCode?: string;
}

const DEFAULT_TOTALS: CartTotals = {
  subtotal: 0,
  shippingFee: 0,
  discount: 0,
  totalPrice: 0,
};

class CartService {
  private readonly ITEMS_ENDPOINT = "/api/cart/items";
  private readonly TOTAL_ENDPOINT = "/api/cart/total";
  private readonly CLEAR_ENDPOINT = "/api/cart/clear";
  private readonly ADD_TO_CART_ENDPOINT = "/api/cart/items/add-to-cart";

  async getCartWithTotals(
    voucherId?: string,
    districtId?: number,
    wardCode?: string,
  ): Promise<{
    items: CartItem[];
    totals: CartTotals;
  }> {
    try {
      // Lấy items và totals từ API
      const items = await this.getItems();
      const totals = await this.getTotals(voucherId, districtId, wardCode);

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
    districtId?: number,
    wardCode?: string,
  ): Promise<CartTotals> {
    try {
      const query = this.buildQuery(voucherId, districtId, wardCode);
      const response = await apiInstance.GET(this.TOTAL_ENDPOINT, {
        params: query ? { query } : undefined,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch cart totals",
        );
      }

      const payload = response.data.payload;
      if (!payload) {
        return DEFAULT_TOTALS;
      }

      return {
        subtotal: Number(payload.subtotal ?? 0),
        shippingFee: Number(payload.shippingFee ?? 0),
        discount: Number(payload.discount ?? 0),
        totalPrice: Number(payload.totalPrice ?? 0),
      };
    } catch (error: any) {
      console.error("Error fetching cart totals:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch cart totals",
      );
    }
  }

  async addItem(variantId: string, quantity: number) {
    try {
      const response = await apiInstance.POST(this.ADD_TO_CART_ENDPOINT, {
        body: { variantId, quantity },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to add item to cart");
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to add item to cart",
      );
    }
  }

  async updateCartItem(cartItemId: string, quantity: number) {
    try {
      const response = await apiInstance.PUT(
        `/api/cart/items/{id}/update-cart-item`,
        {
          params: {
            path: {
              id: cartItemId,
            },
          },
          body: { quantity },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to update cart item");
      }
    } catch (error: any) {
      console.error("Error updating cart item:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update cart item",
      );
    }
  }

  async removeCartItem(cartItemId: string) {
    try {
      const response = await apiInstance.DELETE(
        `/api/cart/items/{id}/remove-from-cart`,
        {
          params: {
            path: {
              id: cartItemId,
            },
          },
        },
      );

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
    districtId?: number,
    wardCode?: string,
  ): VoucherQuery | undefined {
    const query: VoucherQuery = {};

    if (voucherId) {
      query.VoucherCode = voucherId;
    }

    if (districtId) {
      query.DistrictId = districtId;
    }

    if (wardCode) {
      query.WardCode = wardCode;
    }

    return Object.keys(query).length > 0 ? query : undefined;
  }
}

export const cartService = new CartService();
