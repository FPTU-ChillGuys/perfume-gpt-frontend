import { useState, useEffect, type ReactNode, useCallback } from "react";
import { cartService } from "../services/cartService";
import { CartContext } from "./CartContextType";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadCartCount = useCallback(async () => {
    try {
      setIsLoading(true);
      const count = await cartService.getCartItemCount();
      setCartCount(count);
    } catch (error) {
      console.error("Failed to load cart count:", error);
      setCartCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCartCount();
  }, [loadCartCount]);

  const refreshCart = useCallback(async () => {
    await loadCartCount();
  }, [loadCartCount]);

  return (
    <CartContext.Provider
      value={{
        cartCount,
        isLoading,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
