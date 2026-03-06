import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { productService } from "@/services/productService";
import type { ProductFastLook, ProductInformation } from "@/types/product";
import ProductQuickViewDialog from "@/components/product/ProductQuickViewDialog";
import { ProductQuickViewContext } from "@/contexts/productQuickViewContextDefinition";

const toError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error(fallbackMessage);
};

interface ProductQuickViewState {
  open: boolean;
  productId: string | null;
}

export const ProductQuickViewProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [state, setState] = useState<ProductQuickViewState>({
    open: false,
    productId: null,
  });
  const [information, setInformation] = useState<ProductInformation | null>(
    null,
  );
  const [fastLook, setFastLook] = useState<ProductFastLook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductData = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [fastLookResult, infoResult] = await Promise.allSettled([
        productService.getProductFastLook(productId),
        productService.getProductInformation(productId),
      ]);

      if (fastLookResult.status !== "fulfilled" || !fastLookResult.value) {
        const reason =
          fastLookResult.status === "rejected"
            ? toError(
                fastLookResult.reason,
                "Không thể tải thông tin xem nhanh",
              )
            : new Error("Không tìm thấy thông tin xem nhanh");
        console.error("Error loading product fast look:", reason);
        setFastLook(null);
        setInformation(null);
        setError(
          reason.message ||
            "Không thể tải thông tin sản phẩm. Vui lòng thử lại.",
        );
        return;
      }

      setFastLook(fastLookResult.value);

      if (infoResult.status === "fulfilled") {
        setInformation(infoResult.value);
      } else {
        setInformation(null);
        if (infoResult.status === "rejected") {
          const infoError = toError(
            infoResult.reason,
            "Không thể tải thông tin chi tiết",
          );
          console.warn("Không thể tải thông tin chi tiết:", infoError);
        }
      }
    } catch (err: any) {
      console.error("Unexpected error loading quick view data:", err);
      setError(
        err?.message || "Không thể tải thông tin sản phẩm. Vui lòng thử lại.",
      );
      setInformation(null);
      setFastLook(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openQuickView = useCallback(
    (productId: string) => {
      if (!productId) {
        return;
      }
      setState({ open: true, productId });
      setInformation(null);
      setFastLook(null);
      void fetchProductData(productId);
    },
    [fetchProductData],
  );

  const handleClose = () => {
    setState({ open: false, productId: null });
    setInformation(null);
    setFastLook(null);
    setError(null);
  };

  return (
    <ProductQuickViewContext.Provider value={{ openQuickView }}>
      {children}
      <ProductQuickViewDialog
        open={state.open}
        productId={state.productId}
        loading={loading}
        error={error}
        information={information}
        fastLook={fastLook}
        onClose={handleClose}
      />
    </ProductQuickViewContext.Provider>
  );
};
