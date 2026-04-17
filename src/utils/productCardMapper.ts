import type { ProductCardProps } from "@/components/product/ProductCard";
import type {
  ProductListItem,
  ProductListItemWithVariants,
  ProductVariant,
  VariantPagedItem,
} from "@/types/product";

export type VariantCardSource = VariantPagedItem | ProductVariant;

const getVariantImageUrl = (variant?: VariantCardSource) => {
  if (!variant) {
    return undefined;
  }

  if ("variantImageUrl" in variant && variant.variantImageUrl) {
    return typeof variant.variantImageUrl === "string"
      ? variant.variantImageUrl
      : undefined;
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
  const finiteVariantPricesFromField = Array.isArray(product.variantPrices)
    ? product.variantPrices.filter(
        (candidate): candidate is number =>
          typeof candidate === "number" && Number.isFinite(candidate),
      )
    : [];

  const variantItems = Array.isArray((product as any).variants)
    ? ((product as any).variants as Array<{ basePrice?: number; volumeMl?: number }>)
    : [];
  const finiteVariantPricesFromItems = variantItems
    .map((item) => item.basePrice)
    .filter(
      (candidate): candidate is number =>
        typeof candidate === "number" && Number.isFinite(candidate),
    );

  const finiteVariantPrices = [
    ...finiteVariantPricesFromField,
    ...finiteVariantPricesFromItems,
  ];

  const minVariantPrice =
    finiteVariantPrices.length > 0
      ? Math.min(...finiteVariantPrices)
      : undefined;
  const maxVariantPrice =
    finiteVariantPrices.length > 1
      ? Math.max(...finiteVariantPrices)
      : undefined;
  const rawPrice = variant?.basePrice ?? minVariantPrice ?? 0;
  const price = Number(rawPrice);
  const productPrimaryImageUrl =
    typeof product.primaryImage === "string"
      ? product.primaryImage
      : typeof (product.primaryImage as any)?.url === "string"
        ? (product.primaryImage as any).url
        : undefined;

  // Extract tags from product
  const productTags = (product as Record<string, unknown>).tags;
  const tags = Array.isArray(productTags) ? productTags.filter((tag): tag is string => typeof tag === 'string') : null;

  return {
    id: product.id,
    brand: product.brandName ?? "Đang cập nhật",
    name: product.name ?? "Đang cập nhật",
    salePrice: Number.isFinite(price) ? price : 0,
    maxPrice: maxVariantPrice,
    imageUrl: productPrimaryImageUrl ?? getVariantImageUrl(variant),
    variantId: variant?.id,
    numberOfVariants:
      product.numberOfVariants ?? (product as any).variants?.length ?? 0,
    tags,
  };
};

export const withVariantPrimaryImage = (
  variant?: ProductVariant | null,
): VariantCardSource | undefined => {
  if (!variant) {
    return undefined;
  }

  return variant;
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

  // Extract tags from product
  const productTags = productSource.tags;
  const tags = Array.isArray(productTags) ? productTags.filter((tag): tag is string => typeof tag === 'string') : null;

  return {
    id: product.id,
    brand: product.brandName ?? "\u0110ang c\u1eadp nh\u1eadt",
    name: product.name ?? "\u0110ang c\u1eadp nh\u1eadt",
    salePrice: Number.isFinite(price) ? price : 0,
    imageUrl: product.primaryImage?.url ?? undefined,
    variantId: firstVariant?.id,
    numberOfVariants: product.numberOfVariants ?? product.variants?.length ?? 0,
    tags,
  };
};

export const normalizeTrendProducts = (
  products: ProductListItem[],
): ProductCardProps[] =>
  products
    .filter((product): product is ProductListItem & { id: string } =>
      Boolean(product.id),
    )
    .map((product) => {
      const mapped = mapProductToCard(product);
      return { ...mapped, isTrending: true };
    });
