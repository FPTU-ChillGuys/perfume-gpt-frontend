import type { ProductCardProps } from "@/components/product/ProductCard";
import type {
  ProductListItem,
  ProductVariant,
  VariantPagedItem,
} from "@/types/product";

export type VariantCardSource =
  | VariantPagedItem
  | (ProductVariant & {
      primaryImage?: VariantPagedItem["primaryImage"] | null;
    });

const getVariantImageUrl = (variant?: VariantCardSource) => {
  if (!variant) {
    return undefined;
  }

  if (variant.primaryImage?.url) {
    return variant.primaryImage.url;
  }

  if ("media" in variant && variant.media?.length) {
    const primaryMedia = variant.media.find((media) => media?.isPrimary);
    return primaryMedia?.url ?? variant.media[0]?.url ?? undefined;
  }

  return undefined;
};

export const buildVariantMap = (variants: VariantCardSource[]) => {
  const map = new Map<string, VariantCardSource>();

  variants.forEach((variant) => {
    if (variant.productId && !map.has(variant.productId)) {
      map.set(variant.productId, variant);
    }
  });

  return map;
};

export const mapProductToCard = (
  product: ProductListItem & { id: string },
  variant?: VariantCardSource,
): ProductCardProps => {
  const price = Number(variant?.basePrice ?? 0);

  return {
    id: product.id,
    brand: product.brandName ?? "Đang cập nhật",
    name: product.name ?? "Đang cập nhật",
    salePrice: Number.isFinite(price) ? price : 0,
    imageUrl:
      product.primaryImage?.url ?? getVariantImageUrl(variant) ?? undefined,
    variantId: variant?.id,
  };
};

export const withVariantPrimaryImage = (
  variant?: ProductVariant | null,
): VariantCardSource | undefined => {
  if (!variant) {
    return undefined;
  }

  const primaryImage =
    variant.media?.find((media) => media?.isPrimary) ||
    variant.media?.[0] ||
    null;

  return {
    ...variant,
    primaryImage,
  };
};
