import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "../product/ProductCard";

interface ProductSectionProps {
  title: string;
  products: Array<{
    id: string;
    brand: string;
    name: string;
    originalPrice?: number;
    salePrice: number;
    imageUrl?: string;
    isNew?: boolean;
    discount?: number;
  }>;
}

export const ProductSection = ({ title, products }: ProductSectionProps) => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">{title}</h2>
          <a
            href="#"
            className="flex items-center gap-1 text-gray-600 hover:text-red-600 font-medium"
          >
            Xem thêm
            <ChevronRight size={18} />
          </a>
        </div>

        {/* Products Grid */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition">
            <ChevronLeft size={20} />
          </button>
          <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition">
            <ChevronRight size={20} />
          </button>

          {/* Products */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
