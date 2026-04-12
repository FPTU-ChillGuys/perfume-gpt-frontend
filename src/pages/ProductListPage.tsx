import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Loader2, X } from "lucide-react";
import { MainLayout } from "../layouts/MainLayout";
import {
  ProductCard,
  type ProductCardProps,
} from "../components/product/ProductCard";
import { productService } from "../services/productService";
import { campaignService } from "../services/campaignService";
import { trendService } from "../services/ai/trendService";
import { brandService, type BrandLookupItem } from "../services/brandService";
import type { ProductListItem, VariantPagedItem } from "../types/product";
import {
  mapProductToCard,
  mapProductWithVariantsToCard,
} from "../utils/productCardMapper";
import { resolveVariantMapForProducts } from "../utils/variantMapResolver";
import { dexieCache } from "../utils/dexieCache";
import { CACHE_KEYS, CACHE_TTL } from "../constants/cache";
import { productActivityLogService } from "@/services/ai/productActivityLogService";

const PAGE_SIZE_OPTIONS = [12, 24, 36];

const sortOptions = [
  { label: "Nổi bật", value: "featured" },
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Giá tăng dần", value: "priceAsc" },
  { label: "Giá giảm dần", value: "priceDesc" },
  { label: "Tên A → Z", value: "nameAsc" },
  { label: "Tên Z → A", value: "nameDesc" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

type CachedCatalogProduct = {
  product: ProductListItem & { id: string };
  card: ProductCardProps;
  categoryId?: number;
  volumes?: number[];
};

type HomeSource = "bestsellers" | "new-arrivals" | "trending";

type CatalogProduct = ProductListItem & {
  id: string;
  originalIndex: number;
};

type FilterMeta = {
  minPrice: number;
  maxPrice: number;
  volumes: number[];
};

const HOME_SOURCE_LABELS: Record<HomeSource, string> = {
  bestsellers: "Bestsellers",
  "new-arrivals": "New Arrivals",
  trending: "Trending (Weekly)",
};

const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 20_000_000;
const PRICE_RANGE_STEP = 100_000;

const CATEGORY_LABEL_MAP: Record<string, string> = {
  "for women": "Nước hoa cho Nữ",
  "for men": "Nước hoa cho Nam",
  unisex: "Nước hoa Unisex",
  "niche & artisan": "Niche và Artisan",
  "gift sets": "Gift Sets",
};

const isHomeSource = (value: string | null): value is HomeSource =>
  value === "bestsellers" || value === "new-arrivals" || value === "trending";

const getPriceRange = (product: ProductListItem) => {
  const prices = (product.variantPrices ?? []).filter(
    (price): price is number =>
      typeof price === "number" && Number.isFinite(price),
  );

  if (prices.length === 0) {
    return { minPrice: 0, maxPrice: 0 };
  }

  return {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  };
};

const normalizeVolumeOptions = (metaMap: Record<string, FilterMeta>) => {
  const volumeSet = new Set<number>();

  Object.values(metaMap).forEach((meta) => {
    meta.volumes.forEach((volume) => {
      if (Number.isFinite(volume) && volume > 0) {
        volumeSet.add(volume);
      }
    });
  });

  return Array.from(volumeSet).sort((a, b) => a - b);
};

const resolveVolumeMapForProducts = async (
  productIds: string[],
  fetcher: (query: {
    PageNumber: number;
    PageSize: number;
    IsDescending: boolean;
  }) => Promise<{ items?: VariantPagedItem[]; hasNextPage?: boolean }>,
  options?: { pageSize?: number; maxPages?: number },
) => {
  const targetProductIds = new Set(productIds.filter(Boolean));
  const pageSize = options?.pageSize ?? 250;
  const maxPages = options?.maxPages ?? 30;
  const volumeMap = new Map<string, Set<number>>();

  if (targetProductIds.size === 0) {
    return new Map<string, number[]>();
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

    pageItems.forEach((variant) => {
      const productId = variant.productId;
      if (!productId || !targetProductIds.has(productId)) {
        return;
      }

      if (
        typeof variant.volumeMl !== "number" ||
        !Number.isFinite(variant.volumeMl)
      ) {
        return;
      }

      const currentSet = volumeMap.get(productId) ?? new Set<number>();
      currentSet.add(variant.volumeMl);
      volumeMap.set(productId, currentSet);
    });

    if (!page.hasNextPage) {
      break;
    }
  }

  return new Map(
    Array.from(volumeMap.entries()).map(([productId, volumeSet]) => [
      productId,
      Array.from(volumeSet).sort((a, b) => a - b),
    ]),
  );
};

const formatVndCompact = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)} đ`;

const getCardUpperPrice = (product: ProductCardProps) =>
  typeof product.maxPrice === "number" &&
  Number.isFinite(product.maxPrice) &&
  product.maxPrice > product.salePrice
    ? product.maxPrice
    : product.salePrice;

const toVietnameseCategoryName = (name?: string | null) => {
  if (!name) {
    return "Danh mục";
  }

  const normalized = name.trim().toLowerCase();
  return CATEGORY_LABEL_MAP[normalized] || name;
};

export const ProductListPage = () => {
  const [products, setProducts] = useState<ProductCardProps[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [variantByProductId, setVariantByProductId] = useState<
    Record<string, VariantPagedItem>
  >({});
  const [filterMetaByProductId, setFilterMetaByProductId] = useState<
    Record<string, FilterMeta>
  >({});
  const [allModeVolumeOptions, setAllModeVolumeOptions] = useState<number[]>(
    [],
  );
  const [allModeCatalogProducts, setAllModeCatalogProducts] = useState<
    CatalogProduct[]
  >([]);
  const [allModeFilterMetaByProductId, setAllModeFilterMetaByProductId] =
    useState<Record<string, FilterMeta>>({});
  const [brandOptions, setBrandOptions] = useState<BrandLookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0] || 0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const sourceParam = searchParams.get("source");
  const source = isHomeSource(sourceParam) ? sourceParam : null;
  const sourceLabel = searchParams.get("sourceLabel") || "";
  const campaignIdParam = searchParams.get("campaignId") || "";
  const searchParamValue = searchParams.get("search") || "";
  const categoryIdParam = searchParams.get("categoryId") || "";
  const categoryNameParam = searchParams.get("categoryName") || "";
  const isHomeSourceMode = Boolean(source);
  const isCampaignMode = Boolean(campaignIdParam);
  const [searchTerm, setSearchTerm] = useState(searchParamValue);
  const [sort, setSort] = useState<SortValue>(
    (searchParams.get("sort") as SortValue) || "featured",
  );
  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    searchParams.get("brand") || "all",
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(searchParams.get("minPrice")) || PRICE_RANGE_MIN,
    Number(searchParams.get("maxPrice")) || PRICE_RANGE_MAX,
  ]);
  const [selectedVolume, setSelectedVolume] = useState<string>(
    searchParams.get("volume") || "all",
  );

  useEffect(() => {
    let isMounted = true;

    const fetchBrandLookup = async () => {
      try {
        const brands = await brandService.getBrandsLookup();
        if (!isMounted) {
          return;
        }
        setBrandOptions(
          brands
            .filter(
              (brand): brand is BrandLookupItem & { id: number } =>
                typeof brand.id === "number",
            )
            .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
        );
      } catch (lookupError) {
        console.warn("Failed to fetch brand lookup", lookupError);
      }
    };

    void fetchBrandLookup();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper function to map sort value to API params
  const getSortParams = (sortValue: SortValue) => {
    switch (sortValue) {
      case "newest":
        return { SortBy: "CreatedAt", IsDescending: true };
      case "oldest":
        return { SortBy: "CreatedAt", IsDescending: false };
      case "priceAsc":
        return { SortBy: "Price", IsDescending: false };
      case "priceDesc":
        return { SortBy: "Price", IsDescending: true };
      case "nameAsc":
        return { SortBy: "Name", IsDescending: false };
      case "nameDesc":
        return { SortBy: "Name", IsDescending: true };
      case "featured":
      default:
        return {};
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      setVariantByProductId({});
      setAllModeVolumeOptions([]);
      setAllModeCatalogProducts([]);
      setAllModeFilterMetaByProductId({});

      const getCachedCatalogWithVolumes = () =>
        dexieCache.getOrFetch<CachedCatalogProduct[]>(
          CACHE_KEYS.ALL_PRODUCTS_FOR_CATEGORY_FILTER,
          async () => {
            const pPage = await productService.getProducts({
              PageNumber: 1,
              PageSize: 500,
              IsDescending: true,
            });
            const allItems = (pPage?.items ?? []).filter(
              (p): p is ProductListItem & { id: string } => Boolean(p.id),
            );
            const [vMap, volumeMap] = await Promise.all([
              resolveVariantMapForProducts(
                allItems.map((item) => item.id),
                (query) => productService.getProductVariantsPaged(query),
                { pageSize: 250, maxPages: 30 },
              ),
              resolveVolumeMapForProducts(
                allItems.map((item) => item.id),
                (query) => productService.getProductVariantsPaged(query),
                { pageSize: 250, maxPages: 30 },
              ),
            ]);

            return allItems.map((p) => ({
              volumes: volumeMap.get(p.id) ?? [],
              product: p,
              card: mapProductToCard(p, vMap.get(p.id)),
              categoryId: p.categoryId,
            }));
          },
          CACHE_TTL.FIVE_MINUTES,
        );

      try {
        // Campaign mode - fetch products for a specific campaign
        if (campaignIdParam) {
          const result = await campaignService.getCampaignProducts(
            campaignIdParam,
            {
              PageNumber: page,
              PageSize: pageSize,
              IsAvailable: true,
              ...(selectedBrandId !== "all" && {
                BrandId: Number(selectedBrandId),
              }),
              ...(selectedVolume !== "all" && {
                Volume: Number(selectedVolume),
              }),
              ...(priceRange[0] !== PRICE_RANGE_MIN && {
                FromPrice: priceRange[0],
              }),
              ...(priceRange[1] !== PRICE_RANGE_MAX && {
                ToPrice: priceRange[1],
              }),
              ...getSortParams(sort),
            },
          );

          if (!isMounted) {
            return;
          }

          const campaignItems = (result.items ?? []).filter(
            (product): product is ProductListItem & { id: string } =>
              Boolean(product.id),
          );

          setCatalogProducts(
            campaignItems.map((product, index) => ({
              ...product,
              originalIndex: index,
            })),
          );

          const baseMeta: Record<string, FilterMeta> = Object.fromEntries(
            campaignItems.map((product) => {
              const { minPrice, maxPrice } = getPriceRange(product);
              return [
                product.id,
                {
                  minPrice,
                  maxPrice,
                  volumes: [],
                },
              ];
            }),
          );

          setFilterMetaByProductId(baseMeta);
          setProducts(
            campaignItems.map((product) => mapProductToCard(product)),
          );
          setTotalCount(result.totalCount ?? 0);
          setTotalPages(
            Math.ceil((result.totalCount ?? 0) / Math.max(pageSize, 1)),
          );
          setIsLoading(false);

          if (campaignItems.length === 0) {
            return;
          }

          // Fetch variants for rich card display
          const [variantMap, volumeMap] = await Promise.all([
            resolveVariantMapForProducts(
              campaignItems.map((product) => product.id),
              (query) => productService.getProductVariantsPaged(query),
              { pageSize: 250, maxPages: 10 },
            ),
            resolveVolumeMapForProducts(
              campaignItems.map((product) => product.id),
              (query) => productService.getProductVariantsPaged(query),
              { pageSize: 250, maxPages: 10 },
            ),
          ]);

          if (!isMounted) {
            return;
          }

          const variantRecord = Object.fromEntries(variantMap.entries());
          const mergedMeta: Record<string, FilterMeta> = Object.fromEntries(
            campaignItems.map((product) => {
              const current = baseMeta[product.id] ?? {
                minPrice: 0,
                maxPrice: 0,
                volumes: [],
              };
              const volumes = Array.from(volumeMap.get(product.id) ?? []).sort(
                (a, b) => a - b,
              );
              return [
                product.id,
                {
                  ...current,
                  volumes,
                },
              ];
            }),
          );

          setVariantByProductId(variantRecord);
          setFilterMetaByProductId(mergedMeta);
          setProducts(
            campaignItems.map((product) =>
              mapProductToCard(product, variantRecord[product.id]),
            ),
          );
          return;
        }

        if (source) {
          const sourceItemsRaw =
            source === "bestsellers"
              ? ((await productService.getBestSellers()).items ?? [])
              : source === "new-arrivals"
                ? ((await productService.getNewArrivals()).items ?? [])
                : await trendService.getCurrentOrPreviousWeeklyTrend(false);

          if (!isMounted) {
            return;
          }

          const sourceItems = (sourceItemsRaw as unknown[])
            .filter(
              (product): product is ProductListItem & { id: string } =>
                Boolean(product) &&
                typeof product === "object" &&
                Boolean((product as ProductListItem).id),
            )
            .map((product, index) => ({
              ...product,
              originalIndex: index,
            }));

          setCatalogProducts(sourceItems);

          const baseMeta: Record<string, FilterMeta> = Object.fromEntries(
            sourceItems.map((product) => {
              const { minPrice, maxPrice } = getPriceRange(product);
              return [
                product.id,
                {
                  minPrice,
                  maxPrice,
                  volumes: [],
                },
              ];
            }),
          );

          setFilterMetaByProductId(baseMeta);
          setProducts(
            sourceItems.map((product) => ({
              ...mapProductToCard(product),
              isNew: source === "new-arrivals",
            })),
          );
          setTotalCount(sourceItems.length);
          setTotalPages(Math.ceil(sourceItems.length / Math.max(pageSize, 1)));
          setIsLoading(false);

          if (sourceItems.length === 0) {
            return;
          }

          const [variantMap, variantPages] = await Promise.all([
            resolveVariantMapForProducts(
              sourceItems.map((product) => product.id),
              (query) => productService.getProductVariantsPaged(query),
              { pageSize: 250, maxPages: 30 },
            ),
            (async () => {
              const targetIds = new Set(
                sourceItems.map((product) => product.id),
              );
              const volumeMap = new Map<string, Set<number>>();

              for (let pageNumber = 1; pageNumber <= 30; pageNumber += 1) {
                const variantPage =
                  await productService.getProductVariantsPaged({
                    PageNumber: pageNumber,
                    PageSize: 250,
                    IsDescending: true,
                  });

                (variantPage.items ?? []).forEach((variant) => {
                  if (!variant.productId || !targetIds.has(variant.productId)) {
                    return;
                  }
                  if (
                    typeof variant.volumeMl !== "number" ||
                    !Number.isFinite(variant.volumeMl)
                  ) {
                    return;
                  }
                  const current =
                    volumeMap.get(variant.productId) ?? new Set<number>();
                  current.add(variant.volumeMl);
                  volumeMap.set(variant.productId, current);
                });

                if (!variantPage.hasNextPage) {
                  break;
                }
              }

              return volumeMap;
            })(),
          ]);

          if (!isMounted) {
            return;
          }

          const variantRecord = Object.fromEntries(variantMap.entries());
          const mergedMeta: Record<string, FilterMeta> = Object.fromEntries(
            sourceItems.map((product) => {
              const current = baseMeta[product.id] ?? {
                minPrice: 0,
                maxPrice: 0,
                volumes: [],
              };
              const volumes = Array.from(
                variantPages.get(product.id) ?? [],
              ).sort((a, b) => a - b);
              return [
                product.id,
                {
                  ...current,
                  volumes,
                },
              ];
            }),
          );

          setVariantByProductId(variantRecord);
          setFilterMetaByProductId(mergedMeta);
          setProducts(
            sourceItems.map((product) => ({
              ...mapProductToCard(product, variantRecord[product.id]),
              isNew: source === "new-arrivals",
            })),
          );
          return;
        }

        if (searchParamValue) {
          // Semantic search returns products with embedded variants — no extra variant API call needed
          const searchResult = await productService.searchProductsSemantic({
            searchText: searchParamValue,
            PageNumber: page,
            PageSize: pageSize,
            IsDescending: true,
          });

          if (!isMounted) return;

          const items = (searchResult?.items ?? []).filter(
            (product): product is typeof product & { id: string } =>
              Boolean(product.id),
          );

          const mapped = items.map(mapProductWithVariantsToCard);
          setCatalogProducts(
            items.map((item, index) => ({
              ...item,
              originalIndex: index,
            })),
          );
          setFilterMetaByProductId(
            Object.fromEntries(
              items.map((item) => {
                const { minPrice, maxPrice } = getPriceRange(item);
                return [
                  item.id,
                  {
                    minPrice,
                    maxPrice,
                    volumes: [],
                  },
                ];
              }),
            ),
          );
          setProducts(mapped);
          setTotalPages(searchResult?.totalPages ?? 0);
          setTotalCount(searchResult?.totalCount ?? items.length);
          return;
        } else if (categoryIdParam) {
          // Category filter: fetch all products client-side, cache for 5 min
          const cachedCatalog = await getCachedCatalogWithVolumes();

          if (!isMounted) return;

          const categoryId = Number(categoryIdParam);
          const filteredCatalog = cachedCatalog.filter(
            (item) => item.categoryId === categoryId,
          );
          const filtered = filteredCatalog.map((item) => item.card);

          setCatalogProducts(
            filteredCatalog.map((item, index) => ({
              ...item.product,
              originalIndex: index,
            })),
          );
          setFilterMetaByProductId(
            Object.fromEntries(
              filteredCatalog.map((item) => {
                const { minPrice, maxPrice } = getPriceRange(item.product);
                return [
                  item.product.id,
                  {
                    minPrice,
                    maxPrice,
                    volumes: item.volumes ?? [],
                  },
                ];
              }),
            ),
          );

          // Client-side pagination
          const start = (page - 1) * pageSize;
          const paginated = filtered.slice(start, start + pageSize);
          setProducts(paginated);
          setTotalPages(Math.ceil(filtered.length / pageSize));
          setTotalCount(filtered.length);
          return;
        } else {
          // Standard product list API: render products first, then enrich by variants.
          const productPage = await productService.getProducts({
            PageNumber: page,
            PageSize: pageSize,
            IsDescending: true,
          });

          if (!isMounted) {
            return;
          }

          const items = (productPage?.items ?? []).filter(
            (product): product is ProductListItem & { id: string } =>
              Boolean(product.id),
          );

          setCatalogProducts(
            items.map((item, index) => ({
              ...item,
              originalIndex: index,
            })),
          );
          setFilterMetaByProductId(
            Object.fromEntries(
              items.map((item) => {
                const { minPrice, maxPrice } = getPriceRange(item);
                return [
                  item.id,
                  {
                    minPrice,
                    maxPrice,
                    volumes: [],
                  },
                ];
              }),
            ),
          );

          void (async () => {
            try {
              const cachedCatalog = await getCachedCatalogWithVolumes();
              if (!isMounted) {
                return;
              }

              const volumeSet = new Set<number>();
              const allModeMeta: Record<string, FilterMeta> = {};
              const allModeCatalog = cachedCatalog.map((item, index) => {
                const { minPrice, maxPrice } = getPriceRange(item.product);
                allModeMeta[item.product.id] = {
                  minPrice,
                  maxPrice,
                  volumes: item.volumes ?? [],
                };
                return {
                  ...item.product,
                  originalIndex: index,
                };
              });

              cachedCatalog.forEach((item) => {
                (item.volumes ?? []).forEach((volume) => {
                  if (Number.isFinite(volume) && volume > 0) {
                    volumeSet.add(volume);
                  }
                });
              });

              setAllModeCatalogProducts(allModeCatalog);
              setAllModeFilterMetaByProductId(allModeMeta);
              setAllModeVolumeOptions(
                Array.from(volumeSet).sort((a, b) => a - b),
              );
            } catch (volumeError) {
              console.warn(
                "Failed to load all-mode volume options",
                volumeError,
              );
            }
          })();

          // Immediate paint with product-level data while variant API resolves.
          setProducts(items.map((product) => mapProductToCard(product)));
          setTotalPages(productPage?.totalPages ?? 0);
          setTotalCount(productPage?.totalCount ?? items.length);
          setIsLoading(false);

          const variantMap = await resolveVariantMapForProducts(
            items.map((product) => product.id),
            (query) => productService.getProductVariantsPaged(query),
            { pageSize: Math.max(pageSize * 4, 120), maxPages: 20 },
          );

          if (!isMounted) {
            return;
          }

          const mapped = items.map((product) =>
            mapProductToCard(product, variantMap.get(product.id)),
          );

          setFilterMetaByProductId(
            Object.fromEntries(
              items.map((item) => {
                const { minPrice, maxPrice } = getPriceRange(item);
                const variant = variantMap.get(item.id);
                return [
                  item.id,
                  {
                    minPrice,
                    maxPrice,
                    volumes:
                      typeof variant?.volumeMl === "number"
                        ? [variant.volumeMl]
                        : [],
                  },
                ];
              }),
            ),
          );
          setVariantByProductId(Object.fromEntries(variantMap.entries()));
          setProducts(mapped);
          return;
        }
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Không thể tải danh sách sản phẩm. Vui lòng thử lại.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [
    page,
    pageSize,
    searchParamValue,
    categoryIdParam,
    source,
    campaignIdParam,
    sort,
    selectedBrandId,
    selectedVolume,
    priceRange,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchParamValue,
    categoryIdParam,
    source,
    selectedBrandId,
    priceRange,
    selectedVolume,
  ]);

  useEffect(() => {
    setSearchTerm(searchParamValue);
  }, [searchParamValue]);

  // Sync filter state → URL params (preserves existing params like search, categoryId, source)
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (sort && sort !== "featured") {
          next.set("sort", sort);
        } else {
          next.delete("sort");
        }
        if (selectedBrandId && selectedBrandId !== "all") {
          next.set("brand", selectedBrandId);
        } else {
          next.delete("brand");
        }
        if (priceRange[0] !== PRICE_RANGE_MIN) {
          next.set("minPrice", String(priceRange[0]));
        } else {
          next.delete("minPrice");
        }
        if (priceRange[1] !== PRICE_RANGE_MAX) {
          next.set("maxPrice", String(priceRange[1]));
        } else {
          next.delete("maxPrice");
        }
        if (selectedVolume && selectedVolume !== "all") {
          next.set("volume", selectedVolume);
        } else {
          next.delete("volume");
        }
        return next;
      },
      { replace: true },
    );
  }, [sort, selectedBrandId, priceRange, selectedVolume, setSearchParams]);

  const availableVolumes = useMemo(
    () =>
      !isHomeSourceMode &&
      !categoryIdParam &&
      !searchParamValue &&
      allModeVolumeOptions.length > 0
        ? allModeVolumeOptions
        : normalizeVolumeOptions(filterMetaByProductId),
    [
      allModeVolumeOptions,
      categoryIdParam,
      filterMetaByProductId,
      isHomeSourceMode,
      searchParamValue,
    ],
  );

  const selectedBrandIdNumber =
    selectedBrandId === "all" ? null : Number(selectedBrandId);
  const [selectedMinPrice, selectedMaxPrice] = priceRange;
  const selectedVolumeNumber =
    selectedVolume === "all" ? null : Number(selectedVolume);
  const selectedMinPercent =
    ((selectedMinPrice - PRICE_RANGE_MIN) /
      (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) *
    100;
  const selectedMaxPercent =
    ((selectedMaxPrice - PRICE_RANGE_MIN) /
      (PRICE_RANGE_MAX - PRICE_RANGE_MIN)) *
    100;
  const useAllModeCatalog =
    !isHomeSourceMode &&
    !categoryIdParam &&
    !searchParamValue &&
    allModeCatalogProducts.length > 0;
  const activeCatalogProducts = useAllModeCatalog
    ? allModeCatalogProducts
    : catalogProducts;
  const activeFilterMetaByProductId = useAllModeCatalog
    ? allModeFilterMetaByProductId
    : filterMetaByProductId;

  const filteredCatalogProducts = useMemo(() => {
    const normalizedLocalSearch = searchTerm.trim().toLowerCase();
    const normalizedUrlSearch = searchParamValue.trim().toLowerCase();
    const shouldFilterLocally =
      normalizedLocalSearch &&
      (isHomeSourceMode || normalizedLocalSearch !== normalizedUrlSearch);

    const filtered = activeCatalogProducts.filter((product) => {
      if (
        shouldFilterLocally &&
        !product.name?.toLowerCase().includes(normalizedLocalSearch) &&
        !product.brandName?.toLowerCase().includes(normalizedLocalSearch)
      ) {
        return false;
      }

      const meta = activeFilterMetaByProductId[product.id] ?? {
        minPrice: 0,
        maxPrice: 0,
        volumes: [],
      };

      if (
        selectedBrandIdNumber !== null &&
        product.brandId !== selectedBrandIdNumber
      ) {
        return false;
      }
      if (meta.maxPrice < selectedMinPrice) {
        return false;
      }
      if (meta.minPrice > selectedMaxPrice) {
        return false;
      }
      if (
        selectedVolumeNumber !== null &&
        !meta.volumes.some((volume) => volume === selectedVolumeNumber)
      ) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered];
    switch (sort) {
      case "newest":
      case "featured":
        sorted.sort((a, b) => a.originalIndex - b.originalIndex);
        break;
      case "oldest":
        sorted.sort((a, b) => b.originalIndex - a.originalIndex);
        break;
      case "priceAsc":
        sorted.sort(
          (a, b) =>
            (activeFilterMetaByProductId[a.id]?.minPrice ?? 0) -
            (activeFilterMetaByProductId[b.id]?.minPrice ?? 0),
        );
        break;
      case "priceDesc":
        sorted.sort(
          (a, b) =>
            (activeFilterMetaByProductId[b.id]?.maxPrice ?? 0) -
            (activeFilterMetaByProductId[a.id]?.maxPrice ?? 0),
        );
        break;
      case "nameAsc":
        sorted.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "nameDesc":
        sorted.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      default:
        break;
    }

    return sorted;
  }, [
    activeCatalogProducts,
    activeFilterMetaByProductId,
    isHomeSourceMode,
    searchTerm,
    searchParamValue,
    selectedBrandIdNumber,
    selectedMaxPrice,
    selectedMinPrice,
    selectedVolumeNumber,
    sort,
  ]);

  const shouldClientPaginate =
    isHomeSourceMode || Boolean(categoryIdParam) || useAllModeCatalog;
  const filteredTotalCount = filteredCatalogProducts.length;
  const filteredTotalPages =
    filteredTotalCount > 0
      ? Math.ceil(filteredTotalCount / Math.max(pageSize, 1))
      : 0;

  useEffect(() => {
    const pages = shouldClientPaginate ? filteredTotalPages : totalPages;
    if (pages > 0 && page > pages) {
      setPage(pages);
    }
  }, [shouldClientPaginate, filteredTotalPages, page, totalPages]);

  const displayedProducts = useMemo(() => {
    const dataToRender = shouldClientPaginate
      ? filteredCatalogProducts.slice((page - 1) * pageSize, page * pageSize)
      : filteredCatalogProducts;

    if (dataToRender.length > 0) {
      return dataToRender.map((product) => ({
        ...mapProductToCard(product, variantByProductId[product.id]),
        isNew: source === "new-arrivals",
      }));
    }

    if (!shouldClientPaginate) {
      const normalizedLocalSearch = searchTerm.trim().toLowerCase();
      const normalizedUrlSearch = searchParamValue.trim().toLowerCase();
      const shouldFilterLocally =
        normalizedLocalSearch && normalizedLocalSearch !== normalizedUrlSearch;

      const filtered = shouldFilterLocally
        ? products.filter(
            (product) =>
              product.name.toLowerCase().includes(normalizedLocalSearch) ||
              product.brand.toLowerCase().includes(normalizedLocalSearch),
          )
        : products;

      const sorted = [...filtered];
      switch (sort) {
        case "priceAsc":
          sorted.sort((a, b) => a.salePrice - b.salePrice);
          break;
        case "priceDesc":
          sorted.sort((a, b) => getCardUpperPrice(b) - getCardUpperPrice(a));
          break;
        case "nameAsc":
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "nameDesc":
          sorted.sort((a, b) => b.name.localeCompare(a.name));
          break;
        default:
          break;
      }

      return sorted;
    }

    return [];
  }, [
    filteredCatalogProducts,
    page,
    pageSize,
    products,
    searchTerm,
    searchParamValue,
    shouldClientPaginate,
    sort,
    source,
    variantByProductId,
  ]);

  const effectiveTotalCount = shouldClientPaginate
    ? filteredTotalCount
    : totalCount;
  const effectiveTotalPages = shouldClientPaginate
    ? filteredTotalPages
    : totalPages;

  const startItem = effectiveTotalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem =
    effectiveTotalCount === 0 ? 0 : startItem + displayedProducts.length - 1;
  const canGoPrev = page > 1;
  const canGoNext =
    effectiveTotalPages > 0
      ? page < effectiveTotalPages
      : displayedProducts.length === pageSize;

  const handleMinPriceChange = (value: number) => {
    setPriceRange((current) => [Math.min(value, current[1]), current[1]]);
  };

  const handleMaxPriceChange = (value: number) => {
    setPriceRange((current) => [current[0], Math.max(value, current[0])]);
  };

  const renderSkeletons = () =>
    Array.from({ length: pageSize || 12 }).map((_, index) => (
      <div
        key={`skeleton-${index}`}
        className="h-full animate-pulse rounded-2xl border border-gray-100 bg-white p-4"
      >
        <div className="aspect-square w-full rounded-xl bg-gray-100" />
        <div className="mt-4 h-4 rounded bg-gray-100" />
        <div className="mt-2 h-4 w-1/2 rounded bg-gray-100" />
        <div className="mt-4 h-5 w-1/3 rounded bg-gray-100" />
      </div>
    ));

  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-slate-950 pb-12 pt-20 text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-rose-500/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            Curated Catalog 2026
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
            {isHomeSourceMode
              ? `Danh sách nước hoa — ${sourceLabel || HOME_SOURCE_LABELS[source!]}`
              : categoryNameParam
                ? `Danh sách nước hoa — ${toVietnameseCategoryName(categoryNameParam)}`
                : "Danh sách nước hoa"}
          </h1>
          <p className="mt-3 text-sm font-medium text-white/85 md:text-base">
            {new Intl.NumberFormat("vi-VN").format(effectiveTotalCount)} kết quả
          </p>
          <p className="mt-4 max-w-3xl text-base text-white/70 md:text-lg">
            Lọc theo thương hiệu, tìm kiếm nốt hương yêu thích và đặt giữ chỗ
            ngay trong cùng một trang.
          </p>
        </div>
      </section>

      <section className="-mt-12 pb-16">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="h-fit rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                <SlidersHorizontal size={16} />
                Bộ lọc
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Thương hiệu
                  <select
                    value={selectedBrandId}
                    onChange={(event) => setSelectedBrandId(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-900"
                  >
                    <option value="all">Tất cả thương hiệu</option>
                    {brandOptions.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name || `Brand #${brand.id}`}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Mức giá (đ)
                  </p>
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="relative h-8 px-2">
                      <div className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-300" />
                      <div className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2">
                        <div
                          className="absolute inset-y-0 rounded-xs bg-rose-500"
                          style={{
                            left: `${selectedMinPercent}%`,
                            right: `${100 - selectedMaxPercent}%`,
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min={PRICE_RANGE_MIN}
                        max={PRICE_RANGE_MAX}
                        step={PRICE_RANGE_STEP}
                        value={selectedMinPrice}
                        onChange={(event) =>
                          handleMinPriceChange(Number(event.target.value))
                        }
                        className="pointer-events-none absolute left-3 top-1 z-10 h-6 w-[calc(100%-1.5rem)] appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900"
                      />
                      <input
                        type="range"
                        min={PRICE_RANGE_MIN}
                        max={PRICE_RANGE_MAX}
                        step={PRICE_RANGE_STEP}
                        value={selectedMaxPrice}
                        onChange={(event) =>
                          handleMaxPriceChange(Number(event.target.value))
                        }
                        className="pointer-events-none absolute left-3 top-1 z-20 h-6 w-[calc(100%-1.5rem)] appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900"
                      />
                    </div>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatVndCompact(selectedMinPrice)} -{" "}
                      {formatVndCompact(selectedMaxPrice)}
                    </p>
                  </div>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Dung tích (ml)
                  <select
                    value={selectedVolume}
                    onChange={(event) => setSelectedVolume(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-900"
                  >
                    <option value="all">Tất cả dung tích</option>
                    {availableVolumes.map((volume) => (
                      <option key={volume} value={String(volume)}>
                        {volume} ml
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrandId("all");
                    setPriceRange([PRICE_RANGE_MIN, PRICE_RANGE_MAX]);
                    setSelectedVolume("all");
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            </aside>

            <div>
              <div className="mb-6 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-sm text-slate-500">
                    {effectiveTotalCount > 0
                      ? `Hiển thị ${Math.max(startItem, 1)} - ${Math.max(endItem, 0)} trong tổng ${effectiveTotalCount} sản phẩm`
                      : "Chưa có sản phẩm để hiển thị"}
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      type="search"
                      placeholder="Tìm theo tên hoặc thương hiệu"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          if (searchTerm.trim()) {
                            productActivityLogService
                              .logSearch(searchTerm)
                              .catch((logError) => {
                                console.error(
                                  "Failed to log search text",
                                  logError,
                                );
                              });
                            if (!isHomeSourceMode) {
                              setSearchParams({ search: searchTerm.trim() });
                            }
                          } else if (!isHomeSourceMode) {
                            searchParams.delete("search");
                            setSearchParams(searchParams);
                          }
                        }
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {categoryIdParam && (
                      <span className="flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700">
                        {toVietnameseCategoryName(categoryNameParam)}
                        <button
                          type="button"
                          aria-label="Xóa bộ lọc danh mục"
                          onClick={() => {
                            searchParams.delete("categoryId");
                            searchParams.delete("categoryName");
                            setSearchParams(searchParams);
                            setPage(1);
                          }}
                          className="ml-1 rounded-full p-0.5 hover:bg-rose-200"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                    <label className="flex items-center gap-2 text-sm text-slate-500">
                      Sắp xếp theo
                      <select
                        value={sort}
                        onChange={(event) =>
                          setSort(event.target.value as SortValue)
                        }
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus:border-slate-900"
                      >
                        {sortOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-500">
                      Hiển thị
                      <select
                        value={pageSize}
                        onChange={(event) => {
                          setPageSize(Number(event.target.value));
                          setPage(1);
                        }}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 focus:border-slate-900"
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size} sản phẩm
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2">
                {isLoading ? (
                  renderSkeletons()
                ) : displayedProducts.length > 0 ? (
                  displayedProducts.map((product) => (
                    <ProductCard key={product.id} {...product} />
                  ))
                ) : (
                  <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white py-16 text-center">
                    <p className="text-lg font-semibold text-slate-700">
                      Không tìm thấy sản phẩm phù hợp
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Thử điều chỉnh từ khóa tìm kiếm hoặc thay đổi bộ lọc.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white/80 px-6 py-4 shadow-sm md:flex-row">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2
                        size={16}
                        className="animate-spin text-slate-400"
                      />
                      Đang tải trang {page}
                    </span>
                  ) : effectiveTotalPages > 0 ? (
                    <>
                      Trang {page} / {Math.max(effectiveTotalPages, 1)}
                    </>
                  ) : (
                    <>Trang {page}</>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      canGoPrev && setPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={!canGoPrev}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trang trước
                  </button>
                  <button
                    type="button"
                    onClick={() => canGoNext && setPage((prev) => prev + 1)}
                    disabled={!canGoNext}
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trang tiếp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};
