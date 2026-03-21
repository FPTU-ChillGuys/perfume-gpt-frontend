import type { PagedVariantList, VariantPagedItem } from "@/types/product";
import { buildVariantMap } from "@/utils/productCardMapper";

type VariantPageFetcher = (query: {
  PageNumber: number;
  PageSize: number;
  IsDescending: boolean;
}) => Promise<PagedVariantList>;

type ResolveVariantMapOptions = {
  pageSize?: number;
  maxPages?: number;
};

export const resolveVariantMapForProducts = async (
  productIds: string[],
  fetcher: VariantPageFetcher,
  options?: ResolveVariantMapOptions,
) => {
  const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)));
  const targetProductIds = new Set(uniqueProductIds);
  const collectedVariants: VariantPagedItem[] = [];
  const pageSize = options?.pageSize ?? 200;
  const maxPages = options?.maxPages ?? 20;

  if (targetProductIds.size === 0) {
    return new Map<string, VariantPagedItem>();
  }

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await fetcher({
      PageNumber: pageNumber,
      PageSize: pageSize,
      IsDescending: true,
    });

    const pageItems = page.items ?? [];
    if (pageItems.length === 0) {
      break;
    }

    for (const variant of pageItems) {
      const productId = variant.productId;
      if (!productId || !targetProductIds.has(productId)) {
        continue;
      }

      collectedVariants.push(variant);
      targetProductIds.delete(productId);
    }

    if (targetProductIds.size === 0 || !page.hasNextPage) {
      break;
    }
  }

  return buildVariantMap(collectedVariants);
};
