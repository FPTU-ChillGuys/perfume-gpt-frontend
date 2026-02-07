import { apiInstance } from "@/lib/api";
import type { LoginRequest, User } from "../types/auth";
import { getUserFromToken, isTokenExpired } from "../utils/jwt";

class AuthService {
  private readonly AUTH_ENDPOINT = "/api/auths";

  async login(credentials: LoginRequest): Promise<User> {
    try {
      //const response = await axiosInstance.post<LoginResponse>(`${this.AUTH_ENDPOINT}/login`,credentials,);
      const response = await apiInstance.POST(`${this.AUTH_ENDPOINT}/login`, {
        body: credentials,
      });


      if (!response.data!.success) {
        throw new Error(response.data!.message || "Login failed");
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
      console.error("Login error:", error);

      // Return generic message for both 401 and 404 to prevent account enumeration
      const statusCode = error.response?.status;
      if (statusCode === 401 || statusCode === 404) {
        throw new Error(
          "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.",
        );
      }

      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Đăng nhập thất bại. Vui lòng thử lại sau.",
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
