import type { components } from "./api/v1";

export type OrderListItem = components["schemas"]["OrderListItem"];
export type PagedOrderList =
  components["schemas"]["PagedResultOfOrderListItem"];
export type OrderStatus = components["schemas"]["OrderStatus"];
export type OrderType = components["schemas"]["OrderType"];
export type PaymentStatus = components["schemas"]["PaymentStatus"];
export type ShippingStatus = components["schemas"]["ShippingStatus"];
