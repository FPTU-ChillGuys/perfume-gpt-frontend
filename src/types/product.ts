import type { components } from "./api/v1";

export type Supplier = components["schemas"]["SupplierLookupItem"];
export type SuppliersResponse =
  components["schemas"]["BaseResponseOfListOfSupplierLookupItem"];
export type ProductVariant = components["schemas"]["ProductVariantResponse"];
export type ProductVariantsResponse =
  components["schemas"]["BaseResponseOfListOfVariantLookupItem"];

export type ProductListItem = components["schemas"]["ProductListItem"];
export type ProductDetail = components["schemas"]["ProductResponse"];
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
export type MediaResponse = components["schemas"]["MediaResponse"];
export type TemporaryMediaResponse =
  components["schemas"]["TemporaryMediaResponse"];
export type UpdateProductRequest =
  components["schemas"]["UpdateProductRequest"];
export type UpdateVariantRequest =
  components["schemas"]["UpdateVariantRequest"];

export interface ProductImageUploadPayload {
  file: File;
  altText?: string;
  displayOrder?: number;
  isPrimary?: boolean;
}

export type ProductInformation =
  components["schemas"]["ProductInforResponse"];
export type ProductFastLook =
  components["schemas"]["ProductFastLookResponse"];
export type VariantFastLook =
  components["schemas"]["VariantFastLookResponse"];
export type ProductListItemWithVariants =
  components["schemas"]["ProductListItemWithVariants"];
export type PagedProductListWithVariants =
  components["schemas"]["PagedResultOfProductListItemWithVariants"];
export type ProductLookupItem =
  components["schemas"]["ProductLookupItem"];
export type CreateVariantRequest =
  components["schemas"]["CreateVariantRequest"];
export type VariantStatus = components["schemas"]["VariantStatus"];
export type VariantType = components["schemas"]["VariantType"];
