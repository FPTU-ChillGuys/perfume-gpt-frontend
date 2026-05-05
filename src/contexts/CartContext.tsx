import { useState, useEffect, type ReactNode, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { cartService } from "../services/cartService";
import { CartContext } from "./CartContextType";
import { useAuth } from "../hooks/useAuth";
import { NOTIFICATION_HUB_URL, getValidToken } from "../hooks/useNotificationSystem";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [cartCount, setCartCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadCartCount = useCallback(async () => {
    if (!isAuthenticated) {
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
  }, [isAuthenticated]);

  useEffect(() => {
    loadCartCount();
  }, [loadCartCount]);

  const refreshCart = useCallback(async () => {
    await loadCartCount();
  }, [loadCartCount]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    let connection: signalR.HubConnection | null = null;

    const setup = async () => {
      const token = getValidToken();
      if (!token) return;

      const conn = new signalR.HubConnectionBuilder()
        .withUrl(NOTIFICATION_HUB_URL, {
          accessTokenFactory: () => getValidToken(),
        })
        .configureLogging(signalR.LogLevel.Warning)
        .withAutomaticReconnect()
        .build();

      connection = conn;

      conn.on("CartUpdated", (count: number) => {
        if (!isMounted) return;
        setCartCount(count);
      });

      try {
        await conn.start();
      } catch {
        // Connection failed silently — auto-reconnect handles it
      }
    };

    void setup();

    return () => {
      isMounted = false;
      if (connection) {
        void connection.stop();
      }
    };
  }, [isAuthenticated]);

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
