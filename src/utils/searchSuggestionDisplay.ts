import type { ProductListItemWithVariants } from "@/types/product";

const GENDER_DISPLAY_MAP: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  unisex: "Unisex",
  "for men": "Nam",
  "for women": "Nữ",
};

const PRICE_FIELD_CANDIDATES = [
  "price",
  "basePrice",
  "salePrice",
  "variantPrice",
  "unitPrice",
  "fromPrice",
  "toPrice",
  "minPrice",
  "lowestPrice",
  "finalPrice",
  "Price",
  "BasePrice",
  "SalePrice",
  "VariantPrice",
] as const;

const GENDER_FIELD_CANDIDATES = [
  "gender",
  "genderName",
  "targetGender",
  "targetGenderName",
  "Gender",
] as const;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parsePrice = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return null;
};

const normalizeGender = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  return GENDER_DISPLAY_MAP[normalized] ?? value;
};

export const extractSuggestionPrice = (
  product: ProductListItemWithVariants,
): number | null => {
  const source = product as Record<string, unknown>;

  const productLevelPrice = PRICE_FIELD_CANDIDATES
    .map((field) => parsePrice(source[field]))
    .find((price): price is number => price !== null);

  if (productLevelPrice !== undefined) {
    return productLevelPrice;
  }

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variantPrices = variants
    .flatMap((variant) => {
      const variantSource = variant as Record<string, unknown>;
      return PRICE_FIELD_CANDIDATES.map((field) =>
        parsePrice(variantSource[field]),
      );
    })
    .filter((price): price is number => price !== null);

  if (variantPrices.length === 0) {
    return null;
  }

  return Math.min(...variantPrices);
};

export const extractSuggestionPriceRange = (
  product: ProductListItemWithVariants,
): { min: number; max: number } | null => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const variantPrices = variants
    .flatMap((variant) => {
      const variantSource = variant as Record<string, unknown>;
      return PRICE_FIELD_CANDIDATES.map((field) =>
        parsePrice(variantSource[field]),
      );
    })
    .filter((price): price is number => price !== null);

  if (variantPrices.length === 0) {
    const source = product as Record<string, unknown>;
    const productLevelPrice = PRICE_FIELD_CANDIDATES
      .map((field) => parsePrice(source[field]))
      .find((price): price is number => price !== null);

    if (productLevelPrice !== undefined && productLevelPrice !== null) {
      return { min: productLevelPrice, max: productLevelPrice };
    }
    return null;
  }

  return {
    min: Math.min(...variantPrices),
    max: Math.max(...variantPrices),
  };
};

export const extractSuggestionGender = (
  product: ProductListItemWithVariants,
): string | null => {
  const source = product as Record<string, unknown>;

  const directGender = GENDER_FIELD_CANDIDATES
    .map((field) => source[field])
    .find(isNonEmptyString);

  if (directGender) {
    return normalizeGender(directGender);
  }

  if (isNonEmptyString(product.categoryName)) {
    const normalized = product.categoryName.trim().toLowerCase();
    if (normalized in GENDER_DISPLAY_MAP) {
      return normalizeGender(product.categoryName);
    }
  }

  return null;
};

export const formatSuggestionPrice = (price?: number | null) => {
  if (price == null || !Number.isFinite(price) || price <= 0) {
    return "Liên hệ";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

export const formatSuggestionPriceRange = (
  range?: { min: number; max: number } | null,
) => {
  if (!range || range.min <= 0) {
    return "Liên hệ";
  }

  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  });

  if (range.min === range.max) {
    return formatter.format(range.min);
  }

  return `${formatter.format(range.min)} - ${formatter.format(range.max)}`;
};
