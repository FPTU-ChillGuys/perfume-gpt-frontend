import { useState, useEffect, type ReactNode } from "react";
import type { User, LoginRequest } from "../types/auth";
import { authService } from "../services/authService";
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

    // NOTE: Cross-tab sync removed to allow multiple independent sessions
    // Each tab now operates independently with its own auth state
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
