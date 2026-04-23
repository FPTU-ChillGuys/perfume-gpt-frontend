import type { components } from "./api/v1";

export type OrderListItem = components["schemas"]["OrderListItem"];
export type PagedOrderList =
  components["schemas"]["PagedResultOfOrderListItem"];
export type OrderStatus = components["schemas"]["OrderStatus"];
export type OrderType = components["schemas"]["OrderType"];
export type PaymentStatus = components["schemas"]["PaymentStatus"];
export type ShippingStatus = components["schemas"]["ShippingStatus"];

// Order Detail Types
export type OrderResponse = components["schemas"]["OrderResponse"];
export type UserOrderResponse = components["schemas"]["UserOrderResponse"];
export type ShippingInfoResponse = components["schemas"]["ShippingInfoResponse"];
export type RecipientInfoResponse = components["schemas"]["RecipientInfoResponse"];
export type OrderDetailResponse = components["schemas"]["OrderDetailResponse"];
export type CarrierName = components["schemas"]["CarrierName"];
