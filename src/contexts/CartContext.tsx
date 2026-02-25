import { useState, useEffect, type ReactNode, useCallback } from "react";
import { cartService } from "../services/cartService";
import { CartContext } from "./CartContextType";
import { authService } from "../services/authService";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartCount, setCartCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadCartCount = useCallback(async () => {
    // Only load cart if user is authenticated
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      setCartCount(0);
      setIsLoading(false);
      return;
    }

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
  }, []); // Empty dependency is fine - we check auth inside the function

  useEffect(() => {
    loadCartCount();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
