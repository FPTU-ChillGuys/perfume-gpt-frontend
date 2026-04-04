import type { components } from "./api/v1";

export type PaymentMethod = components["schemas"]["PaymentMethod"];
export type RecipientInformation =
  components["schemas"]["ContactAddressInformation"];
export type PaymentInformation = components["schemas"]["PaymentInformation"];
export type CreateOrderRequest = components["schemas"]["CreateOrderRequest"];
export type CreateOrderDetailRequest =
  components["schemas"]["CreateOrderDetailRequest"];
export type CreateInStoreOrderRequest =
  components["schemas"]["CreateInStoreOrderRequest"];

export interface CheckoutResponse {
  url?: string; // VnPay/Momo payment URL
  orderId?: string;
}
