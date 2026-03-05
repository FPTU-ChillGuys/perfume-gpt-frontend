import { useContext } from "react";
import { ProductQuickViewContext } from "@/contexts/productQuickViewContextDefinition";

export const useProductQuickView = () => {
  const context = useContext(ProductQuickViewContext);
  if (!context) {
    throw new Error(
      "useProductQuickView must be used within a ProductQuickViewProvider",
    );
  }
  return context;
};
