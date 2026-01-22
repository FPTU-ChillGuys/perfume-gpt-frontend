import { ChevronRight } from "lucide-react";

const brands = [
  "GUCCI",
  "Dior",
  "GUCCI",
  "Dior",
  "Dior",
  "GUCCI",
  "Dior",
  "GUCCI",
  "GUCCI",
  "Dior",
  "GUCCI",
  "Dior",
  "Dior",
  "GUCCI",
  "Dior",
  "GUCCI",
];

export const BrandSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Thương hiệu nổi bật</h2>
          <a
            href="#"
            className="flex items-center gap-1 text-gray-600 hover:text-red-600 font-medium"
          >
            Xem thêm
            <ChevronRight size={18} />
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {brands.map((brand, index) => (
            <div
              key={index}
              className="aspect-square bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:shadow-md hover:border-gray-300 transition cursor-pointer"
            >
              <span className="text-xl font-bold text-gray-800">{brand}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
