import { apiInstance } from "@/lib/api";
import type {
  AddressResponse,
  CreateAddressRequest,
  UpdateAddressRequest,
  ProvinceResponse,
  DistrictResponse,
  WardResponse,
} from "@/types/address";

class AddressService {
  async getAddresses(): Promise<AddressResponse[]> {
    try {
      const response = await apiInstance.GET("/api/address");

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch addresses");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching addresses:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch addresses",
      );
    }
  }

  async getProvinces(): Promise<ProvinceResponse[]> {
    try {
      const response = await apiInstance.GET("/api/address/provinces");

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch provinces");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching provinces:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch provinces",
      );
    }
  }

  async getDistricts(provinceId: number): Promise<DistrictResponse[]> {
    try {
      const response = await apiInstance.GET("/api/address/districts", {
        params: {
          query: { provinceId },
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch districts");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching districts:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch districts",
      );
    }
  }

  async getWards(districtId: number): Promise<WardResponse[]> {
    try {
      const response = await apiInstance.GET("/api/address/wards", {
        params: {
          query: { districtId },
        },
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to fetch wards");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error fetching wards:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Failed to fetch wards",
      );
    }
  }

  async getStreets(params?: {
    Province?: string;
    District?: string;
    Ward_street?: string;
  }): Promise<string[]> {
    try {
      const response = await apiInstance.GET("/api/address/streets", {
        params: {
          query: params,
        },
      });

      if (!response.data?.success || !response.data.payload?.data) {
        throw new Error(response.data?.message || "Failed to fetch streets");
      }

      return response.data.payload.data;
    } catch (error: any) {
      console.error("Error fetching streets:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch streets",
      );
    }
  }

  async createAddress(request: CreateAddressRequest): Promise<string> {
    try {
      const response = await apiInstance.POST("/api/address", {
        body: request,
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to create address");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error creating address:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to create address",
      );
    }
  }

  async updateAddress(
    id: string,
    request: UpdateAddressRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.PUT("/api/address/{id}", {
        params: {
          path: { id },
        },
        body: request,
      });

      if (!response.data?.success || !response.data.payload) {
        throw new Error(response.data?.message || "Failed to update address");
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error updating address:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update address",
      );
    }
  }

  async setDefaultAddress(id: string): Promise<string> {
    try {
      const response = await apiInstance.PUT(
        "/api/address/{id}/set-default",
        {
          params: {
            path: { id },
          },
        },
      );

      if (!response.data?.success || !response.data.payload) {
        throw new Error(
          response.data?.message || "Failed to set default address",
        );
      }

      return response.data.payload;
    } catch (error: any) {
      console.error("Error setting default address:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to set default address",
      );
    }
  }
}

export const addressService = new AddressService();
