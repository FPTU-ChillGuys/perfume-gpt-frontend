import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Heart } from "lucide-react";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import { useProductQuickView } from "@/hooks/useProductQuickView";

export interface ProductCardProps {
  id: string;
  brand: string;
  name: string;
  originalPrice?: number;
  salePrice: number;
  imageUrl?: string;
  isNew?: boolean;
  discount?: number;
  variantId?: string;
}

export const ProductCard = ({
  id,
  brand,
  name,
  originalPrice,
  salePrice,
  imageUrl,
  isNew,
  discount,
  variantId,
}: ProductCardProps) => {
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const { openQuickView } = useProductQuickView();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const handleNavigateDetail = () => {
    if (!id) {
      return;
    }
    navigate(`/products/${id}`);
  };

  const handleAddToCart = async () => {
    if (!variantId) {
      showToast("Sản phẩm chưa sẵn sàng để mua", "warning");
      return;
    }

    setIsAdding(true);
    try {
      await cartService.addItem(variantId, 1);
      await refreshCart();
      showToast("Đã thêm sản phẩm vào giỏ hàng", "success");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Không thể thêm sản phẩm vào giỏ hàng",
        "error",
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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

      {/* Favorite & Quick View Buttons */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
        <button
          type="button"
          aria-label="Xem nhanh sản phẩm"
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            openQuickView(id);
          }}
          className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
        >
          <Eye size={18} className="text-gray-700" />
        </button>
        <button
          type="button"
          aria-label="Thêm vào yêu thích"
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
        >
          <Heart size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Image */}
      <div
        className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden p-4 cursor-pointer"
        onClick={handleNavigateDetail}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
        <p
          className="text-xs text-gray-500 uppercase font-semibold mb-1 cursor-pointer"
          onClick={handleNavigateDetail}
        >
          {brand}
        </p>
        <h3
          className="text-sm font-medium text-gray-800 mb-2 line-clamp-2 min-h-[40px] cursor-pointer"
          onClick={handleNavigateDetail}
        >
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
