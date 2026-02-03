import axiosInstance from "../lib/axios";

export interface StaffUser {
  id: string;
  userName: string;
  fullName: string;
  email: string;
}

export interface StaffLookupResponse {
  payload: StaffUser[];
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

class UserService {
  private USERS_ENDPOINT = "/api/users";

  async getStaffLookup(): Promise<StaffLookupResponse> {
    try {
      const response = await axiosInstance.get<StaffLookupResponse>(
        `${this.USERS_ENDPOINT}/staff-lookup`,
      );

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
}

export const userService = new UserService();
