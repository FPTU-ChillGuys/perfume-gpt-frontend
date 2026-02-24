import { apiInstance } from "@/lib/api";
import type { CartItem, CartTotals } from "@/types/cart";

interface VoucherQuery {
  voucherId?: string;
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

  async getCartWithTotals(voucherId?: string): Promise<{
    items: CartItem[];
    totals: CartTotals;
  }> {
    try {
      const items = await this.getItems();

      // Tính totals từ items
      const subtotal = items.reduce((sum, item) => {
        return sum + (Number(item.subTotal) || 0);
      }, 0);

      // Nếu có voucher, call API để get discount
      let discount = 0;
      if (voucherId) {
        try {
          const totalsFromApi = await this.getTotals(voucherId);
          discount = totalsFromApi.discount;
        } catch (error) {
          console.error("Error fetching discount:", error);
        }
      }

      // Logic shipping fee đơn giản: free nếu > 500k, còn lại 30k
      const shippingFee = subtotal > 500000 ? 0 : 30000;
      const totalPrice = subtotal + shippingFee - discount;

      return {
        items,
        totals: {
          subtotal,
          shippingFee,
          discount,
          totalPrice,
        },
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

  async getTotals(voucherId?: string): Promise<CartTotals> {
    try {
      const response = await apiInstance.GET(this.TOTAL_ENDPOINT, {
        params: {
          query: this.parseVoucher(voucherId),
        },
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

  private parseVoucher(voucherId?: string): VoucherQuery | undefined {
    if (!voucherId) {
      return undefined;
    }

    return { voucherId };
  }
}

export const cartService = new CartService();
