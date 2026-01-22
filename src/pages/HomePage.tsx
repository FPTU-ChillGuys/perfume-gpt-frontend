import { MainLayout } from "../layouts/MainLayout";
import { HeroSection } from "../components/home/HeroSection";
import { BrandSection } from "../components/home/BrandSection";
import { FeatureSection } from "../components/home/FeatureSection";
import { ProductSection } from "../components/home/ProductSection";

// Mock data - sẽ fetch từ API sau
const newArrivals = [
  {
    id: "1",
    brand: "VALENTINO",
    name: "Uomo Born In Roma Green Stravaganza Eau De Toilette",
    originalPrice: 2800000,
    salePrice: 2100000,
    isNew: true,
    discount: 25,
  },
  {
    id: "2",
    brand: "VALENTINO",
    name: "Valentino Donna Born In Roma Eau De Parfum",
    salePrice: 2850000,
    isNew: true,
  },
  {
    id: "3",
    brand: "PRADA",
    name: "Prada Paradoxe Eau De Parfum",
    salePrice: 4250000,
    isNew: true,
  },
  {
    id: "4",
    brand: "PRADA",
    name: "Prada L'Homme Eau De Toilette",
    salePrice: 2950000,
    isNew: true,
  },
  {
    id: "5",
    brand: "GUCCI",
    name: "GUCCI Guilty Pour Homme Eau De Parfum",
    originalPrice: 3600000,
    salePrice: 2850000,
    isNew: true,
    discount: 21,
  },
  {
    id: "6",
    brand: "VALENTINO",
    name: "Valentino Donna Born In Roma Coral Fantasy",
    salePrice: 3200000,
  },
];

const bestsellers = [
  {
    id: "7",
    brand: "VERSACE",
    name: "Dylan Turquoise Eau De Toilette",
    originalPrice: 3500000,
    salePrice: 2800000,
  },
  {
    id: "8",
    brand: "VERSACE",
    name: "Bright Crystal Eau De Toilette",
    originalPrice: 3400000,
    salePrice: 2700000,
  },
  {
    id: "9",
    brand: "VERSACE",
    name: "Dylan Blue Eau De Toilette",
    originalPrice: 3800000,
    salePrice: 3100000,
  },
  {
    id: "10",
    brand: "CAROLINA HERRERA",
    name: "Good Girl Eau De Parfum",
    salePrice: 4200000,
  },
  {
    id: "11",
    brand: "JEAN PAUL GAULTIER",
    name: "La Belle Eau De Parfum",
    salePrice: 3900000,
  },
  {
    id: "12",
    brand: "GUCCI",
    name: "Gucci Bloom Eau De Parfum",
    salePrice: 3600000,
  },
];

export const HomePage = () => {
  return (
    <MainLayout>
      <HeroSection />
      <BrandSection />
      <FeatureSection />
      <ProductSection title="New Arrivals" products={newArrivals} />
      <ProductSection title="Bestsellers" products={bestsellers} />
    </MainLayout>
  );
};
