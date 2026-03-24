import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Loader2, X } from "lucide-react";
import { MainLayout } from "../layouts/MainLayout";
import {
  ProductCard,
  type ProductCardProps,
} from "../components/product/ProductCard";
import { productService } from "../services/productService";
import type { ProductListItem } from "../types/product";
import {
  mapProductToCard,
  mapProductWithVariantsToCard,
} from "../utils/productCardMapper";
import { resolveVariantMapForProducts } from "../utils/variantMapResolver";
import { dexieCache } from "../utils/dexieCache";
import { CACHE_KEYS, CACHE_TTL } from "../constants/cache";
import { productActivityLogService } from "@/services/ai/productActivityLogService";
import { aiProductSearchService } from "@/services/ai/productSearchService";

const PAGE_SIZE_OPTIONS = [12, 24, 36];

const sortOptions = [
  { label: "Nổi bật", value: "featured" },
  { label: "Giá tăng dần", value: "priceAsc" },
  { label: "Giá giảm dần", value: "priceDesc" },
  { label: "Tên A → Z", value: "nameAsc" },
  { label: "Tên Z → A", value: "nameDesc" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

type CachedCatalogProduct = {
  card: ProductCardProps;
  categoryId?: number;
};

export const ProductListPage = () => {
  const [products, setProducts] = useState<ProductCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0] || 0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamValue = searchParams.get("search") || "";
  const categoryIdParam = searchParams.get("categoryId") || "";
  const categoryNameParam = searchParams.get("categoryName") || "";
  const [searchTerm, setSearchTerm] = useState(searchParamValue);
  const [sort, setSort] = useState<SortValue>("featured");

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (searchParamValue) {
          // Semantic search returns products with embedded variants — no extra variant API call needed
          const searchResult = await aiProductSearchService.searchProducts({
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
          setProducts(mapped);
          setTotalPages(searchResult?.totalPages ?? 0);
          setTotalCount(searchResult?.totalCount ?? items.length);
          return;
        } else if (categoryIdParam) {
          // Category filter: fetch all products client-side, cache for 5 min
          const cachedCatalog = await dexieCache.getOrFetch<
            CachedCatalogProduct[]
          >(
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
              const vMap = await resolveVariantMapForProducts(
                allItems.map((item) => item.id),
                (query) => productService.getProductVariantsPaged(query),
                { pageSize: 250, maxPages: 30 },
              );
              return allItems.map((p) => ({
                card: mapProductToCard(p, vMap.get(p.id)),
                categoryId: p.categoryId,
              }));
            },
            CACHE_TTL.FIVE_MINUTES,
          );

          if (!isMounted) return;

          const categoryId = Number(categoryIdParam);
          const filtered = cachedCatalog
            .filter((item) => item.categoryId === categoryId)
            .map((item) => item.card);

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
  }, [page, pageSize, searchParamValue, categoryIdParam]);

  useEffect(() => {
    setPage(1);
  }, [searchParamValue, categoryIdParam]);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const displayedProducts = useMemo(() => {
    // If we have a semantic search term from URL, the backend already filtered it.
    // So we only filter client-side if the user types locally but hasn't submitted yet.
    const normalizedLocalSearch = searchTerm.trim().toLowerCase();
    const normalizedUrlSearch = searchParamValue.trim().toLowerCase();

    // Only apply local filter if the local search term is different from the URL parameter
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
        sorted.sort((a, b) => b.salePrice - a.salePrice);
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
  }, [products, searchTerm, searchParamValue, sort]);

  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = totalCount === 0 ? 0 : startItem + products.length - 1;
  const canGoPrev = page > 1;
  const canGoNext =
    totalPages > 0 ? page < totalPages : products.length === pageSize;

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
            {categoryNameParam
              ? `Danh sách nước hoa — ${categoryNameParam}`
              : "Danh sách nước hoa"}
          </h1>
          <p className="mt-4 max-w-3xl text-base text-white/70 md:text-lg">
            Lọc theo thương hiệu, tìm kiếm nốt hương yêu thích và đặt giữ chỗ
            ngay trong cùng một trang.
          </p>
        </div>
      </section>

      <section className="-mt-12 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-6 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                <SlidersHorizontal size={16} />
                Bộ lọc catalog
              </div>
              <div className="text-sm text-slate-500">
                {totalCount > 0
                  ? `Hiển thị ${Math.max(startItem, 1)} - ${Math.max(endItem, 0)} trong tổng ${totalCount} sản phẩm`
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
                        productActivityLogService.logSearch(searchTerm).catch((error) => {
                          console.error("Failed to log search text", error);
                        });
                        setSearchParams({ search: searchTerm.trim() });
                      } else {
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
                    {categoryNameParam || "Danh mục"}
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
                  Sắp xếp
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
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                  Đang tải trang {page}
                </span>
              ) : totalPages > 0 ? (
                <>
                  Trang {page} / {Math.max(totalPages, 1)}
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
      </section>
    </MainLayout>
  );
};
