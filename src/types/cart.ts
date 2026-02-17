import type { components } from "./api/v1";

export type CartItem = components["schemas"]["GetCartItemResponse"];
export type CartItemsApiResponse = components["schemas"]["GetCartItemsResponse"];
export type CartTotalsApiResponse = components["schemas"]["GetCartTotalResponse"];

export interface CartTotals {
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalPrice: number;
}
