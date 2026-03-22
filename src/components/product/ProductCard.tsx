import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import { useProductQuickView } from "@/hooks/useProductQuickView";
import { productActivityLogService } from "@/services/ai/productActivityLogService";

export interface ProductCardProps {
  id: string;
  brand: string;
  name: string;
  originalPrice?: number;
  salePrice: number;
  maxPrice?: number;
  imageUrl?: string;
  isNew?: boolean;
  discount?: number;
  variantId?: string;
  firstVariantVolumeMl?: number;
  numberOfVariants?: number;
}

export const ProductCard = ({
  id,
  brand,
  name,
  originalPrice,
  salePrice,
  maxPrice,
  imageUrl,
  isNew,
  discount,
  variantId,
  firstVariantVolumeMl,
  numberOfVariants,
}: ProductCardProps) => {
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const { openQuickView } = useProductQuickView();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  const hasPriceRange =
    typeof maxPrice === "number" &&
    Number.isFinite(maxPrice) &&
    maxPrice > salePrice;

  const handleNavigateDetail = () => {
    if (!id) {
      return;
    }

    productActivityLogService
      .logProductView(id, variantId ?? null)
      .catch((error) => {
        console.error("Failed to log product click", error);
      });

    const variantQuery = variantId
      ? `?variantId=${encodeURIComponent(variantId)}`
      : "";
    navigate(`/products/${id}${variantQuery}`);
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
            void productActivityLogService
              .logProductView(id, variantId ?? null)
              .catch((error) => {
                console.error("Failed to log quick view click", error);
              });
            openQuickView(id);
          }}
          className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
        >
          <Eye size={18} className="text-gray-700" />
        </button>
      </div>

      {/* Image */}
      <div
        className="aspect-square bg-white flex items-center justify-center overflow-hidden p-4 cursor-pointer"
        onClick={handleNavigateDetail}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
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
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <p
          className="text-xs text-gray-500 uppercase font-semibold mb-1 cursor-pointer text-center"
          onClick={handleNavigateDetail}
        >
          {brand}
        </p>
        <h3
          className="text-sm font-medium text-gray-800 mb-2 line-clamp-2  min-h-10 cursor-pointer text-center"
          onClick={handleNavigateDetail}
        >
          {name}
        </h3>
        <div className="flex min-h-6 items-center justify-center gap-1">
          {originalPrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className="whitespace-nowrap text-sm font-bold leading-5 text-red-600">
            {hasPriceRange
              ? `${formatPrice(salePrice)} - ${formatPrice(maxPrice)}`
              : formatPrice(salePrice)}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500 text-center">
          {typeof firstVariantVolumeMl === "number" && firstVariantVolumeMl > 0
            ? `${firstVariantVolumeMl}ml`
            : (numberOfVariants ?? 0) > 0
            ? (numberOfVariants ?? 0) > 1
              ? `${numberOfVariants} Sizes`
              : `${numberOfVariants} Size`
            : "Chưa có size"}
        </p>
      </div>
    </div>
  );
};
