import { apiInstance } from "@/lib/api";
import type { LoginRequest, User } from "../types/auth";
import { getUserFromToken, isTokenExpired } from "../utils/jwt";

class AuthService {
  private readonly AUTH_ENDPOINT = "/api/auths";

  async login(credentials: LoginRequest): Promise<User> {
    const response = await apiInstance.POST(`${this.AUTH_ENDPOINT}/login`, {
      body: credentials,
    });

    if (response.error !== undefined || !response.data?.success) {
      const status = response.response?.status;
      if (status === 401 || status === 404) {
        throw new Error("Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
      }
      throw new Error(
        (response.error as any)?.message ||
          response.data?.message ||
          "Đăng nhập thất bại. Vui lòng thử lại sau.",
      );
    }

    const accessToken = response.data.payload!.accessToken!;

    // Extract user info from token
    const user = getUserFromToken(accessToken);
    if (!user) {
      throw new Error("Invalid token format");
    }

    // Store token and user info
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("user", JSON.stringify(user));

    return user;
  }

  async googleLogin(idToken: string): Promise<User> {
    try {
      const response = await apiInstance.POST(
        `${this.AUTH_ENDPOINT}/google-login`,
        {
          body: { idToken },
        },
      );

      if (!response.data!.success) {
        throw new Error(
          response.data!.message || "Google login failed",
        );
      }

      const accessToken = response.data!.payload!.accessToken!;

      // Extract user info from token
      const user = getUserFromToken(accessToken);
      if (!user) {
        throw new Error("Invalid token format");
      }

      // Store token and user info
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      return user;
    } catch (error: any) {
      console.error("Google login error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Đăng nhập Google thất bại. Vui lòng thử lại sau.",
      );
    }
  }

  logout(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }

  getCurrentUser(): User | null {
    const token = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      this.logout();
      return null;
    }

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem("accessToken");
    if (!token) return false;
    return !isTokenExpired(token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem("accessToken");
  }
}

export const authService = new AuthService();
