import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type StorePolicyResponse = components["schemas"]["StorePolicyResponse"];
export type UpdateStorePolicyRequest = components["schemas"]["UpdateStorePolicyRequest"];

export const storePolicyService = {
  getCurrentPolicy: async (): Promise<StorePolicyResponse> => {
    try {
      const response = await apiInstance.GET("/api/storepolicies/current");
      
      if (response.error) {
        throw new Error(response.error.message || "Không thể tải cấu hình chính sách");
      }
      
      if (!response.data.success) {
        throw new Error(response.data.message || "Không thể tải cấu hình chính sách");
      }

      return response.data.payload as StorePolicyResponse;
    } catch (error: any) {
      if (error instanceof Error) throw error;
      throw new Error(error?.message || "Không thể tải cấu hình chính sách");
    }
  },

  updatePolicy: async (body: UpdateStorePolicyRequest): Promise<StorePolicyResponse> => {
    try {
      const response = await apiInstance.PUT("/api/storepolicies/current", {
        body,
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Không thể cập nhật cấu hình chính sách");
      }
      
      if (!response.data.success) {
        throw new Error(response.data.message || "Không thể cập nhật cấu hình chính sách");
      }

      return response.data.payload as StorePolicyResponse;
    } catch (error: any) {
      if (error instanceof Error) throw error;
      throw new Error(error?.message || "Không thể cập nhật cấu hình chính sách");
    }
  },
};
