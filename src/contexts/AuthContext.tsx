import { useState, useEffect, type ReactNode } from "react";
import type { User, LoginRequest } from "../types/auth";
import { authService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContextType";
import { useToast } from "../hooks/useToast";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const loadUser = () => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const userData = await authService.login(credentials);
    setUser(userData);
    
    showToast("Đăng nhập thành công!", "success");

    // Redirect based on role
    switch (userData.role) {
      case "admin":
        navigate("/admin/dashboard");
        break;
      case "staff":
        navigate("/staff/dashboard");
        break;
      case "user":
        navigate("/");
        break;
      default:
        navigate("/");
    }
  };

  const googleLogin = async (idToken: string) => {
    const userData = await authService.googleLogin(idToken);
    setUser(userData);
    
    showToast("Đăng nhập Google thành công!", "success");

    // Redirect based on role
    switch (userData.role) {
      case "admin":
        navigate("/admin/dashboard");
        break;
      case "staff":
        navigate("/staff/dashboard");
        break;
      case "user":
        navigate("/");
        break;
      default:
        navigate("/");
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    showToast("Đăng xuất thành công!", "success");
    navigate("/");
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
