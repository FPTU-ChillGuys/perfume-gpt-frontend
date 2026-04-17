import type { components } from "./api/v1";

export type CartItem = components["schemas"]["GetCartItemResponse"];
export type CartItemsApiResponse =
  components["schemas"]["GetCartItemsResponse"];
export type CartTotalsApiResponse =
  components["schemas"]["GetCartTotalResponse"];

export interface CartTotals {
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalPrice: number;
  warningMessage?: string;
  responseMessage?: string;
}

export interface ApplyVoucherRequest {
  voucherCode: string;
  orderAmount: number;
}

export interface ApplyVoucherResponse {
  voucherCode: string;
  discountAmount: number;
  finalAmount: number;
  message?: string;
}
