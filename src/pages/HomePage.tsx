import { useEffect, useState } from "react";
import { MainLayout } from "../layouts/MainLayout";
import { HeroSection } from "../components/home/HeroSection";
import { CollectionBannerSection } from "../components/home/CollectionBannerSection";
import { FeatureSection } from "../components/home/FeatureSection";
import { ProductSection } from "../components/home/ProductSection";
import { productService } from "../services/productService";
import type { ProductListItem } from "../types/product";
import type { ProductCardProps } from "../components/product/ProductCard";
import { buildVariantMap, mapProductToCard } from "../utils/productCardMapper";

export const HomePage = () => {
  const [newArrivals, setNewArrivals] = useState<ProductCardProps[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <MainLayout>
      <HeroSection />
      <CollectionBannerSection />
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
