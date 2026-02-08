import { apiInstance } from "@/lib/api";
import type { StaffLookupResponse } from "../types/staff-user";

class UserService {

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
}

export const userService = new UserService();
