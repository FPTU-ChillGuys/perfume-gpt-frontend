import { ProductSection } from "./ProductSection";
import type { ProductCardProps } from "../product/ProductCard";

interface CampaignProductSectionProps {
  campaignId: string;
  campaignName: string;
  products: ProductCardProps[];
  isLoading?: boolean;
}

export const CampaignProductSection = ({
  campaignId,
  campaignName,
  products,
  isLoading = false,
}: CampaignProductSectionProps) => {
  const viewMoreHref = `/products?campaignId=${campaignId}&sourceLabel=${encodeURIComponent(campaignName)}`;

  return (
    <ProductSection
      title={campaignName}
      products={products}
      isLoading={isLoading}
      emptyMessage="Chiến dịch chưa có sản phẩm nào."
      viewMoreHref={viewMoreHref}
      enableInfiniteScroll={true}
    />
  );
};
