import { useEffect, useState } from "react";
import { MainLayout } from "../layouts/MainLayout";
import { HeroSection } from "../components/home/HeroSection";
import { BrandSection } from "../components/home/BrandSection";
import { FeatureSection } from "../components/home/FeatureSection";
import { ProductSection } from "../components/home/ProductSection";
import { productService } from "../services/productService";
import type { ProductListItem, VariantPagedItem } from "../types/product";
import type { ProductCardProps } from "../components/product/ProductCard";

const buildVariantMap = (variants: VariantPagedItem[]) => {
  const map = new Map<string, VariantPagedItem>();

  variants.forEach((variant) => {
    if (variant.productId && !map.has(variant.productId)) {
      map.set(variant.productId, variant);
    }
  });

  return map;
};

const mapProductToCard = (
  product: ProductListItem & { id: string },
  variant?: VariantPagedItem,
): ProductCardProps => {
  const price = Number(variant?.basePrice ?? 0);
  return {
    id: product.id,
    brand: product.brandName ?? "Đang cập nhật",
    name: product.name ?? "Đang cập nhật",
    salePrice: Number.isFinite(price) ? price : 0,
    imageUrl:
      product.primaryImage?.url ?? variant?.primaryImage?.url ?? undefined,
    variantId: variant?.id,
  };
};

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
              PageSize: 100, // Fetch enough variants to cover both sections
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
      <BrandSection />
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
