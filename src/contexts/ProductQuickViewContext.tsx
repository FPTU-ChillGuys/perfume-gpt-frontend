import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { productService } from "@/services/productService";
import type { ProductFastLook, ProductInformation } from "@/types/product";
import ProductQuickViewDialog from "@/components/product/ProductQuickViewDialog";

interface ProductQuickViewContextValue {
  openQuickView: (productId: string) => void;
}

interface ProductQuickViewState {
  open: boolean;
  productId: string | null;
}

const ProductQuickViewContext = createContext<ProductQuickViewContextValue | null>(
  null,
);

export const ProductQuickViewProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [state, setState] = useState<ProductQuickViewState>({
    open: false,
    productId: null,
  });
  const [information, setInformation] = useState<ProductInformation | null>(null);
  const [fastLook, setFastLook] = useState<ProductFastLook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductData = useCallback(async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [info, fastLookResponse] = await Promise.all([
        productService.getProductInformation(productId),
        productService.getProductFastLook(productId),
      ]);
      setInformation(info);
      setFastLook(fastLookResponse);
    } catch (err: any) {
      console.error("Error loading quick view data:", err);
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

export const useProductQuickView = () => {
  const context = useContext(ProductQuickViewContext);
  if (!context) {
    throw new Error(
      "useProductQuickView must be used within a ProductQuickViewProvider",
    );
  }
  return context;
};
