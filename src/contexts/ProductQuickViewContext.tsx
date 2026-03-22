import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { productService } from "@/services/productService";
import type { ProductFastLook } from "@/types/product";
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
  const [fastLook, setFastLook] = useState<ProductFastLook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductData = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      const fastLookResult = await productService.getProductFastLook(productId);

      if (!fastLookResult) {
        const reason = new Error("Không tìm thấy thông tin xem nhanh");
        console.error("Error loading product fast look:", reason);
        setFastLook(null);
        setError(
          reason.message ||
            "Không thể tải thông tin sản phẩm. Vui lòng thử lại.",
        );
        return;
      }

      setFastLook(fastLookResult);
    } catch (err: any) {
      const quickViewError = toError(
        err,
        "Không thể tải thông tin xem nhanh sản phẩm",
      );
      console.error("Unexpected error loading quick view data:", quickViewError);
      setError(
        quickViewError.message ||
          "Không thể tải thông tin sản phẩm. Vui lòng thử lại.",
      );
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
      setFastLook(null);
      void fetchProductData(productId);
    },
    [fetchProductData],
  );

  const handleClose = () => {
    setState({ open: false, productId: null });
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
        fastLook={fastLook}
        onClose={handleClose}
      />
    </ProductQuickViewContext.Provider>
  );
};
