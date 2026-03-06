import { createContext } from "react";

export interface ProductQuickViewContextValue {
  openQuickView: (productId: string) => void;
}

export const ProductQuickViewContext =
  createContext<ProductQuickViewContextValue | null>(null);
