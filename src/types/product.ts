import type { components } from "./api/v1";

export type Supplier = components["schemas"]["SupplierLookupItem"];
export type SuppliersResponse = components["schemas"]["BaseResponseOfListOfSupplierLookupItem"];
export type ProductVariant = components["schemas"]["ProductVariantResponse"];
export type ProductVariantsResponse = components["schemas"]["BaseResponseOfListOfVariantLookupItem"];
