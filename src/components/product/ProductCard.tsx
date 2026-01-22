import { Heart } from "lucide-react";

interface ProductCardProps {
  id: string;
  brand: string;
  name: string;
  originalPrice?: number;
  salePrice: number;
  imageUrl?: string;
  isNew?: boolean;
  discount?: number;
}

export const ProductCard = ({
  brand,
  name,
  originalPrice,
  salePrice,
  imageUrl,
  isNew,
  discount,
}: ProductCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {isNew && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            NEW
          </span>
        )}
        {discount && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            -{discount}%
          </span>
        )}
      </div>

      {/* Favorite Button */}
      <button className="absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow hover:bg-gray-100">
        <Heart size={18} className="text-gray-600" />
      </button>

      {/* Image */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="text-gray-400 text-center p-4">
            <div className="w-24 h-32 mx-auto bg-gray-200 rounded-lg mb-2"></div>
            <span className="text-sm">No Image</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
          {brand}
        </p>
        <h3 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2 min-h-[40px]">
          {name}
        </h3>
        <div className="flex items-center gap-2">
          {originalPrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className="text-red-600 font-bold">
            {formatPrice(salePrice)}
          </span>
        </div>
      </div>
    </div>
  );
};
