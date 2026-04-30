import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { useCart } from "@/hooks/useCart";
import { useProductQuickView } from "@/hooks/useProductQuickView";
import { productActivityLogService } from "@/services/ai/productActivityLogService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";

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
  numberOfVariants?: number;
  tags?: string[] | null;
  aiAcceptanceId?: string;
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
  numberOfVariants,
  tags,
  aiAcceptanceId,
}: ProductCardProps) => {
  const { showToast } = useToast();
  const { refreshCart } = useCart();
  const { openQuickView } = useProductQuickView();
  const [isAdding, setIsAdding] = useState(false);

  /** Full format: 3.450.000đ */
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
  };

  /** Compact format: 3.45tr / 450k */
  const formatPriceCompact = (price: number): string => {
    if (price >= 1_000_000) {
      const val = price / 1_000_000;
      const formatted =
        val % 1 === 0 ? `${val}` : val.toFixed(val < 10 ? 2 : 1).replace(/\.?0+$/, "");
      return `${formatted}tr`;
    }
    if (price >= 1_000) {
      const val = price / 1_000;
      return `${Math.round(val)}k`;
    }
    return `${price}đ`;
  };

  const hasPriceRange =
    typeof maxPrice === "number" &&
    Number.isFinite(maxPrice) &&
    maxPrice > salePrice;

  const detailHref = (() => {
    const queryParams = new URLSearchParams();
    if (aiAcceptanceId) {
      queryParams.set("aiAcceptanceId", aiAcceptanceId);
    }
    const queryString = queryParams.toString();
    return `/products/${id}${queryString ? `?${queryString}` : ""}`;
  })();

  const handleProductLinkClick = () => {
    if (!id) {
      return;
    }

    productActivityLogService
      .logProductView(id, variantId ?? null)
      .catch((error) => {
        console.error("Failed to log product click", error);
      });
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

      // Mark as accepted if inside an AI recommendation context
      if (aiAcceptanceId) {
        try {
          await aiAcceptanceService.clickAIAcceptance(aiAcceptanceId);
        } catch (error) {
          console.error("Failed to mark AI acceptance on direct cart add:", error);
        }
      }
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

  // Check tags from API (preferred) or fallback to legacy props
  const hasNewTag = tags?.some(tag => tag?.toLowerCase() === 'new') ?? isNew;
  const hasSaleTag = tags?.some(tag => tag?.toLowerCase() === 'sale') ?? (discount || (originalPrice && originalPrice > salePrice));

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {hasNewTag && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            NEW
          </span>
        )}
        {hasSaleTag && (
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            SALE
          </span>
        )}
        {discount && (
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
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
            openQuickView(id, aiAcceptanceId);
          }}
          className="p-1.5 sm:p-2 bg-white rounded-full shadow hover:bg-gray-100"
        >
          <Eye size={16} className="text-gray-700 sm:hidden" />
          <Eye size={18} className="text-gray-700 hidden sm:block" />
        </button>
      </div>

      {/* Image */}
      <Link
        to={detailHref}
        onClick={handleProductLinkClick}
        className="aspect-square bg-white flex items-center justify-center overflow-hidden p-2 sm:p-4 cursor-pointer"
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
      </Link>

      {/* Info */}
      <div className="p-2 sm:p-4 bg-gray-50 border-t border-gray-100 flex flex-col flex-grow">
        <Link
          to={detailHref}
          onClick={handleProductLinkClick}
          className="block"
        >
          <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold mb-0.5 sm:mb-1 cursor-pointer text-center">
            {brand}
          </p>
          <h3 className="text-xs sm:text-sm font-medium text-gray-800 mb-1 sm:mb-2 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] cursor-pointer text-center">
            {name}
          </h3>
        </Link>
        <div className="mt-auto w-full">
          {/* Price — full numbers, always 1 row */}
          <div className="text-center leading-snug px-0.5">
            {hasPriceRange ? (
              <span className="inline-flex items-baseline gap-[2px] flex-nowrap justify-center w-full overflow-hidden">
                <span className="text-[10px] sm:text-xs md:text-sm font-bold text-red-600 whitespace-nowrap">
                  {formatPrice(salePrice)}
                </span>
                <span className="text-gray-400 font-normal text-[9px] sm:text-[10px] shrink-0">&nbsp;–&nbsp;</span>
                <span className="text-[10px] sm:text-xs md:text-sm font-bold text-red-600 whitespace-nowrap">
                  {formatPrice(maxPrice!)}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-baseline gap-[3px] flex-nowrap justify-center w-full overflow-hidden">
                {originalPrice && (
                  <span className="text-[9px] sm:text-[10px] text-gray-400 line-through whitespace-nowrap shrink-0">
                    {formatPrice(originalPrice)}
                  </span>
                )}
                <span className="text-[11px] sm:text-xs md:text-sm font-bold text-red-600 whitespace-nowrap">
                  {formatPrice(salePrice)}
                </span>
              </span>
            )}
          </div>
        <p className="mt-1 text-[10px] sm:text-xs text-gray-500 text-center">
          {(numberOfVariants ?? 0) > 0
            ? (numberOfVariants ?? 0) > 1
              ? `${numberOfVariants} Sizes`
              : `${numberOfVariants} Size`
            : "Chưa có size"}
        </p>
        </div>
      </div>
    </div>
  );
};
