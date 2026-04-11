import { useState, useEffect, type ReactNode } from "react";
import type { User, LoginRequest } from "../types/auth";
import { authService } from "../services/authService";
import { setStoredAuth } from "@/utils/authStorage";
import { AuthContext } from "./AuthContextType";
import { useToast } from "../hooks/useToast";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    // Check if user is already logged in on mount
    const loadUser = () => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    loadUser();

    // Keep auth UI in sync when login/logout happens in another tab.
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && event.key !== "accessToken" && event.key !== "user") {
        return;
      }

      setUser(authService.getCurrentUser());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const login = async (credentials: LoginRequest): Promise<User> => {
    const userData = await authService.login(credentials);
    setUser(userData);
    showToast("Đăng nhập thành công!", "success");
    return userData;
  };

  const googleLogin = async (idToken: string): Promise<User> => {
    const userData = await authService.googleLogin(idToken);
    setUser(userData);
    showToast("Đăng nhập Google thành công!", "success");
    return userData;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    showToast("Đăng xuất thành công!", "success");
    window.location.href = "/";
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      // Keep storage in sync so other tabs / page reloads see the change.
      const token = authService.getAccessToken();
      if (token) {
        setStoredAuth(token, JSON.stringify(updated));
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        googleLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
