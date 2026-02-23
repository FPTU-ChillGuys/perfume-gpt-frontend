import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, type ProductCardProps } from "../product/ProductCard";

interface ProductSectionProps {
  title: string;
  products: ProductCardProps[];
  isLoading?: boolean;
  emptyMessage?: string;
}

const SKELETON_ITEMS = 6;

const renderSkeletonItems = () =>
  Array.from({ length: SKELETON_ITEMS }).map((_, index) => (
    <div
      key={`skeleton-${index}`}
      className="h-full rounded-lg border border-gray-100 bg-white p-4 animate-pulse"
    >
      <div className="aspect-square w-full rounded-md bg-gray-100" />
      <div className="mt-4 h-4 rounded bg-gray-100" />
      <div className="mt-2 h-4 rounded bg-gray-100" />
      <div className="mt-4 h-5 w-1/2 rounded bg-gray-100" />
    </div>
  ));

export const ProductSection = ({
  title,
  products,
  isLoading = false,
  emptyMessage = "Hiện chưa có sản phẩm để hiển thị.",
}: ProductSectionProps) => {
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
        <div className="relative px-12">
          {/* Navigation Buttons */}
          <button className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition">
            <ChevronLeft size={20} />
          </button>
          <button className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition">
            <ChevronRight size={20} />
          </button>

          {/* Products */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {isLoading
              ? renderSkeletonItems()
              : products.length > 0
                ? products.map((product) => (
                    <ProductCard key={product.id} {...product} />
                  ))
                : (
                    <div className="col-span-full rounded-lg border border-dashed border-gray-200 py-12 text-center text-gray-500">
                      {emptyMessage}
                    </div>
                  )}
          </div>
        </div>
      </div>
    </section>
  );
};
