import { apiInstance } from "@/lib/api";
import type { UserProfile, UpdateProfileRequest } from "../types/profile";

class ProfileService {
  private readonly PROFILE_ENDPOINT = "/api/profiles";

  async getMyProfile(): Promise<UserProfile> {
    try {
      const response = await apiInstance.GET("/api/profiles/me");

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to fetch profile");
      }

      return response.data.payload as unknown as UserProfile;
    } catch (error: any) {
      console.error("Get profile error:", error);
      throw new Error(error.message || "Không thể tải thông tin profile");
    }
  }

  async updateProfile(data: UpdateProfileRequest): Promise<string> {
    try {
      const response = await apiInstance.PUT(this.PROFILE_ENDPOINT, {
        body: data,
      });

      if (!response.data!.success) {
        throw new Error(response.data!.message || "Failed to update profile");
      }

      return response.data!.message || "Profile updated successfully";
    } catch (error: any) {
      console.error("Update profile error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật profile",
      );
    }
  }
}

export const profileService = new ProfileService();
