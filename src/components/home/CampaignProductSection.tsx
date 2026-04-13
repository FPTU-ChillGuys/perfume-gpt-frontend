import { useMemo } from "react";
import { ProductSection } from "./ProductSection";
import type { ProductCardProps } from "../product/ProductCard";

interface CampaignProductSectionProps {
  campaignId: string;
  campaignName: string;
  products: ProductCardProps[];
  isLoading?: boolean;
}

const MIN_CAROUSEL_ITEMS = 18; // At least 3 repeats for smooth scrolling
const MIN_REPEAT_COUNT = 3; // Minimum times to repeat products

/**
 * Repeats products array for infinite carousel effect
 * Always repeats at least MIN_REPEAT_COUNT times or until MIN_CAROUSEL_ITEMS is reached
 */
const padProductsForCarousel = (
  products: ProductCardProps[],
  minItems: number,
): ProductCardProps[] => {
  if (products.length === 0) return [];

  // Calculate how many times we need to repeat
  const repeatCount = Math.max(
    MIN_REPEAT_COUNT,
    Math.ceil(minItems / products.length),
  );

  const result: ProductCardProps[] = [];

  // Repeat products for infinite scroll effect
  // Keep original product.id for navigation, React keys will be handled by index
  for (let repeat = 0; repeat < repeatCount; repeat++) {
    products.forEach((product) => {
      result.push({
        ...product,
        // Keep original ID for navigation - don't add repeat suffix
      });
    });
  }

  return result;
};

export const CampaignProductSection = ({
  campaignId,
  campaignName,
  products,
  isLoading = false,
}: CampaignProductSectionProps) => {
  const displayProducts = useMemo(
    () => padProductsForCarousel(products, MIN_CAROUSEL_ITEMS),
    [products],
  );

  const viewMoreHref = `/products?campaignId=${campaignId}&sourceLabel=${encodeURIComponent(campaignName)}`;

  return (
    <ProductSection
      title={campaignName}
      products={displayProducts}
      isLoading={isLoading}
      emptyMessage="Chiến dịch chưa có sản phẩm nào."
      viewMoreHref={viewMoreHref}
      enableInfiniteScroll={true}
    />
  );
};
