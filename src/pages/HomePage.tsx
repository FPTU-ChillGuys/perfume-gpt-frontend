import { useEffect, useState } from "react";
import { MainLayout } from "../layouts/MainLayout";
import { HeroSection } from "../components/home/HeroSection";
import { FeatureSection } from "../components/home/FeatureSection";
import { ProductSection } from "../components/home/ProductSection";
import { CampaignProductSection } from "../components/home/CampaignProductSection";
import { productService } from "../services/productService";
import { campaignService } from "../services/campaignService";
import type { CampaignLookupItem } from "../services/campaignService";
import { trendService } from "../services/ai/trendService";
import type { ProductListItem } from "../types/product";
import type { ProductCardProps } from "../components/product/ProductCard";
import {
  mapProductToCard,
  normalizeTrendProducts,
} from "../utils/productCardMapper";

const HOME_SECTION_PAGE_SIZE = 10;

type CampaignWithProducts = {
  campaign: CampaignLookupItem;
  products: ProductCardProps[];
  isLoading: boolean;
};

export const HomePage = () => {
  const [newArrivals, setNewArrivals] = useState<ProductCardProps[]>([]);
  const [bestsellers, setBestsellers] = useState<ProductCardProps[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<ProductCardProps[]>(
    [],
  );
  const [campaignSections, setCampaignSections] = useState<
    CampaignWithProducts[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // General products fetch
  useEffect(() => {
    let isMounted = true;

    const fetchHomeProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [newArrivalsPage, bestsellersPage] = await Promise.all([
          productService.getNewArrivals({ PageSize: HOME_SECTION_PAGE_SIZE }),
          productService.getBestSellers({ PageSize: HOME_SECTION_PAGE_SIZE }),
        ]);

        if (!isMounted) {
          return;
        }

        const normalizedNewArrivals = newArrivalsPage.items
          .filter((product): product is ProductListItem & { id: string } =>
            Boolean(product.id),
          )
          .map((product) => ({
            ...mapProductToCard(product),
            isNew: true,
          }));

        const normalizedBestsellers = bestsellersPage.items
          .filter((product): product is ProductListItem & { id: string } =>
            Boolean(product.id),
          )
          .map((product) => mapProductToCard(product));

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

    const fetchTrending = async () => {
      setIsTrendingLoading(true);
      try {
        const products =
          await trendService.getCurrentOrPreviousWeeklyTrend(false);

        if (!isMounted) return;

        // If both unavailable, leave trendingProducts empty (section hidden)
        if (products && products.length > 0) {
          setTrendingProducts(
            normalizeTrendProducts(products).slice(0, HOME_SECTION_PAGE_SIZE),
          );
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

  // Campaign products fetch
  useEffect(() => {
    let isMounted = true;

    const fetchCampaigns = async () => {
      setIsCampaignsLoading(true);
      try {
        // Fetch active campaigns
        const activeCampaigns = await campaignService.getActiveCampaigns();

        if (!isMounted || activeCampaigns.length === 0) {
          setIsCampaignsLoading(false);
          return;
        }

        // Initialize campaign sections with loading state
        const initialSections: CampaignWithProducts[] = activeCampaigns.map(
          (campaign) => ({
            campaign,
            products: [],
            isLoading: true,
          }),
        );

        setCampaignSections(initialSections);

        // Fetch products for each campaign
        const productsFetches = activeCampaigns.map(async (campaign) => {
          try {
            const result = await campaignService.getCampaignProducts(
              campaign.id,
              {
                PageSize: HOME_SECTION_PAGE_SIZE,
                IsAvailable: true,
              },
            );

            if (!isMounted) return null;

            const normalizedProducts = result.items
              .filter((product): product is ProductListItem & { id: string } =>
                Boolean(product.id),
              )
              .map((product) => mapProductToCard(product));

            return {
              campaign,
              products: normalizedProducts,
              isLoading: false,
            };
          } catch (error) {
            console.warn(
              `Failed to fetch products for campaign ${campaign.name}:`,
              error,
            );
            return {
              campaign,
              products: [],
              isLoading: false,
            };
          }
        });

        // Wait for all products to load
        const sections = (await Promise.all(productsFetches)).filter(
          (section): section is CampaignWithProducts => section !== null,
        );

        if (isMounted) {
          // Only show campaigns that have products
          setCampaignSections(
            sections.filter((section) => section.products.length > 0),
          );
        }
      } catch (error) {
        console.warn("Failed to fetch campaigns:", error);
      } finally {
        if (isMounted) {
          setIsCampaignsLoading(false);
        }
      }
    };

    void fetchCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <MainLayout>
      <HeroSection />

      {/* Campaign product sections - Show active sales/promotions first */}
      {!isCampaignsLoading &&
        campaignSections.map((section) => (
          <CampaignProductSection
            key={section.campaign.id}
            campaignId={section.campaign.id}
            campaignName={section.campaign.name}
            products={section.products}
            isLoading={section.isLoading}
          />
        ))}

      {/* Completely hide the section while loading or if it's empty. */}
      {!isTrendingLoading && trendingProducts.length > 0 && (
        <ProductSection
          title="Trending (Weekly)"
          products={trendingProducts}
          isLoading={false}
          viewMoreHref="/products?source=trending&sourceLabel=Trending%20%28Weekly%29"
        />
      )}

      <ProductSection
        title="New Arrivals"
        products={newArrivals}
        isLoading={isLoading}
        viewMoreHref="/products?source=new-arrivals&sourceLabel=New%20Arrivals"
      />

      <ProductSection
        title="Bestsellers"
        products={bestsellers}
        isLoading={isLoading}
        viewMoreHref="/products?source=bestsellers&sourceLabel=Bestsellers"
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
