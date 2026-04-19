import { createContext } from "react";

export interface ProductQuickViewContextValue {
  openQuickView: (productId: string, aiAcceptanceId?: string) => void;
}

export const ProductQuickViewContext =
  createContext<ProductQuickViewContextValue | null>(null);
