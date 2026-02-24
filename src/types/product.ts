import type { components } from "./api/v1";

export type Supplier = components["schemas"]["SupplierLookupItem"];
export type SuppliersResponse =
  components["schemas"]["BaseResponseOfListOfSupplierLookupItem"];
export type ProductVariant = components["schemas"]["ProductVariantResponse"];
export type ProductVariantsResponse =
  components["schemas"]["BaseResponseOfListOfVariantLookupItem"];

export type ProductListItem = components["schemas"]["ProductListItem"];
export type PagedProductList =
  components["schemas"]["PagedResultOfProductListItem"];
export type VariantPagedItem = components["schemas"]["VariantPagedItem"];
export type PagedVariantList =
  components["schemas"]["PagedResultOfVariantPagedItem"];

export type CreateProductRequest =
  components["schemas"]["CreateProductRequest"];
export type ProductAttributeDto = components["schemas"]["ProductAttributeDto"];

export type AttributeLookupItem = components["schemas"]["AttributeLookupItem"];
export type AttributeValueLookupItem =
  components["schemas"]["AttributeValueLookupItem"];
