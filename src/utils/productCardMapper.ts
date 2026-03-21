import type { ProductCardProps } from "@/components/product/ProductCard";
import type {
  ProductListItem,
  ProductListItemWithVariants,
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
    firstVariantVolumeMl:
      typeof variant?.volumeMl === "number" ? variant.volumeMl : undefined,
    numberOfVariants: product.numberOfVariants ?? 0,
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

/**
 * Maps a semantic search result (product with embedded variants) directly to a card,
 * without needing a separate variant API call.
 */
export const mapProductWithVariantsToCard = (
  product: ProductListItemWithVariants & { id: string },
): ProductCardProps => {
  const firstVariant = product.variants?.[0];
  const productSource = product as Record<string, unknown>;
  const variantSource = firstVariant as Record<string, unknown> | undefined;
  const priceCandidates = [
    variantSource?.basePrice,
    variantSource?.price,
    variantSource?.salePrice,
    variantSource?.variantPrice,
    productSource.basePrice,
    productSource.price,
    productSource.salePrice,
    productSource.variantPrice,
    productSource.minPrice,
    productSource.lowestPrice,
  ];
  const resolvedPrice = priceCandidates.find(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
  const price = typeof resolvedPrice === "number" ? resolvedPrice : 0;
  const volumeCandidates = [
    variantSource?.volumeMl,
    variantSource?.volume,
    productSource.volumeMl,
  ];
  const resolvedVolume = volumeCandidates.find(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );

  return {
    id: product.id,
    brand: product.brandName ?? "\u0110ang c\u1eadp nh\u1eadt",
    name: product.name ?? "\u0110ang c\u1eadp nh\u1eadt",
    salePrice: Number.isFinite(price) ? price : 0,
    imageUrl: product.primaryImage?.url ?? undefined,
    variantId: firstVariant?.id,
    firstVariantVolumeMl:
      typeof resolvedVolume === "number" ? resolvedVolume : undefined,
    numberOfVariants: product.numberOfVariants ?? product.variants?.length ?? 0,
  };
};

export const normalizeTrendProducts = (products: ProductListItem[]): ProductCardProps[] =>
  products
    .filter((product): product is ProductListItem & { id: string } => Boolean(product.id))
    .map((product: any) => {
      const firstVariant = product.variants?.[0];
      const mapped = mapProductToCard(product, firstVariant);
      const imageUrl =
        typeof product.primaryImage === "string"
          ? product.primaryImage
          : mapped.imageUrl;
      const numberOfVariants =
        product.variants?.length ?? product.numberOfVariants ?? 0;
      return { ...mapped, imageUrl, numberOfVariants, isTrending: true };
    });

