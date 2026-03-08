import { useEffect, useState } from "react";
import { MainLayout } from "../layouts/MainLayout";
import { HeroSection } from "../components/home/HeroSection";
import { CollectionBannerSection } from "../components/home/CollectionBannerSection";
import { FeatureSection } from "../components/home/FeatureSection";
import { ProductSection } from "../components/home/ProductSection";
import { productService } from "../services/productService";
import { trendService, getLastSunday, getPrevSunday } from "../services/ai/trendService";
import type { ProductListItem } from "../types/product";
import type { ProductCardProps } from "../components/product/ProductCard";
import { buildVariantMap, mapProductToCard } from "../utils/productCardMapper";
import dayjs from "dayjs";

export const HomePage = () => {
  const [newArrivals, setNewArrivals] = useState<ProductCardProps[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductCardProps[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<ProductCardProps[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // General products fetch
  useEffect(() => {
    let isMounted = true;

    const fetchHomeProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [newArrivalsPage, bestsellersPage, variantPage] =
          await Promise.all([
            productService.getNewArrivals(),
            productService.getBestSellers(),
            productService.getProductVariantsPaged({
              PageNumber: 1,
              PageSize: 48, // Fetch variants for both sections (24 products each)
              IsDescending: true,
            }),
          ]);

        if (!isMounted) {
          return;
        }

        const variantMap = buildVariantMap(variantPage.items);

        const normalizedNewArrivals = newArrivalsPage.items
          .filter((product): product is ProductListItem & { id: string } =>
            Boolean(product.id),
          )
          .map((product) => ({
            ...mapProductToCard(product, variantMap.get(product.id)),
            isNew: true,
          }));

        const normalizedBestsellers = bestsellersPage.items
          .filter((product): product is ProductListItem & { id: string } =>
            Boolean(product.id),
          )
          .map((product) =>
            mapProductToCard(product, variantMap.get(product.id)),
          );

        setNewArrivals(normalizedNewArrivals);
        setBestsellers(normalizedBestsellers);
      } catch (fetchError) {
        if (!isMounted) {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Không thể tải sản phẩm. Vui lòng thử lại.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchHomeProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Trending fetch - separated so it doesn't block the rest
  useEffect(() => {
    let isMounted = true;

    const normalizeTrendProducts = (products: ProductListItem[]): ProductCardProps[] =>
      products
        .filter((product): product is ProductListItem & { id: string } => Boolean(product.id))
        .map((product: any) => {
          const firstVariant = product.variants?.[0];
          const mapped = mapProductToCard(product, firstVariant);
          const imageUrl =
            typeof product.primaryImage === "string"
              ? product.primaryImage
              : mapped.imageUrl;
          return { ...mapped, imageUrl, isTrending: true };
        });

    const fetchTrending = async () => {
      setIsTrendingLoading(true);
      try {
        // Always use the most recent Sunday as endDate (cached weekly).
        // e.g. Monday 9/3 → endDate = Sunday 8/3; Sunday 15/3 → endDate = 15/3
        const lastSunday = dayjs(getLastSunday()).format("YYYY-MM-DD");
        const prevSunday = dayjs(getPrevSunday()).format("YYYY-MM-DD");

        // Try the most recent Sunday first
        let products = await trendService.getTrendingProducts("weekly", lastSunday).catch(() => null);

        // If still generating (null), fall back to the previous Sunday
        if (products === null) {
          products = await trendService.getTrendingProducts("weekly", prevSunday).catch(() => null);
        }

        if (!isMounted) return;

        // If both unavailable, leave trendingProducts empty (section hidden)
        if (products && products.length > 0) {
          setTrendingProducts(normalizeTrendProducts(products));
        }
      } catch (e) {
        console.warn("Failed to fetch trending products", e);
      } finally {
        if (isMounted) setIsTrendingLoading(false);
      }
    };

    void fetchTrending();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <MainLayout>
      <HeroSection />
      <CollectionBannerSection />

      {/* Completely hide the section while loading or if it's empty. */}
      {(!isTrendingLoading && trendingProducts.length > 0) && (
        <ProductSection
          title="Trending (Weekly)"
          products={trendingProducts}
          isLoading={false}
        />
      )}

      <ProductSection
        title="New Arrivals"
        products={newArrivals}
        isLoading={isLoading}
      />
      <ProductSection
        title="Bestsellers"
        products={bestsellers}
        isLoading={isLoading}
      />
      <FeatureSection />
      {error && (
        <div className="container mx-auto px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}
    </MainLayout>
  );
};

