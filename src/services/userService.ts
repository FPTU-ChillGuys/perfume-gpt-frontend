import { apiInstance } from "@/lib/api";
import type { StaffLookupResponse } from "../types/staff-user";
import type { components } from "@/types/api/v1";

export type UserCredentials = components["schemas"]["UserCredentialsResponse"];
export type UserAvatar = components["schemas"]["MediaResponse"];

class UserService {

  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  async getUserMe(): Promise<UserCredentials> {
    const response = await apiInstance.GET("/api/users/me");
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to fetch user info");
    }
    return response.data.payload as UserCredentials;
  }

  async getStaffLookup(): Promise<StaffLookupResponse> {
    try {
      //const response = await axiosInstance.get<StaffLookupResponse>(`${this.USERS_ENDPOINT}/staff-lookup`,);
      const response = await apiInstance.GET(`/api/users/staff-lookup`);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to fetch staff lookup",
        );
      }

      return response.data;
    } catch (error: any) {
      console.error("Get staff lookup error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch staff lookup",
      );
    }
  }

  async getUserById(id: string): Promise<string | null> {
    const response = await apiInstance.GET("/api/users/{id}", {
      params: {
        path: { id },
      },
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to fetch user by id");
    }

    return (response.data.payload as string | null | undefined) ?? null;
  }

  async getMyAvatar(): Promise<UserAvatar | null> {
    const response = await apiInstance.GET("/api/users/avatar");

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to fetch avatar");
    }

    return (response.data.payload as UserAvatar | null | undefined) ?? null;
  }

  async uploadAvatar(file: File, altText?: string): Promise<string> {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("Bạn chưa đăng nhập");
    }

    const formData = new FormData();
    formData.append("Avatar", file);
    formData.append("AltText", altText || "");

    const response = await fetch(`${this.API_BASE_URL}/api/users/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Tải ảnh đại diện thất bại");
    }

    return result.message || "Tải ảnh đại diện thành công";
  }

  async deleteMyAvatar(): Promise<string> {
    const response = await apiInstance.DELETE("/api/users/avatar");

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to delete avatar");
    }

    return response.data.message || "Xóa ảnh đại diện thành công";
  }
}

export const userService = new UserService();
