import { apiInstance, getApiBaseUrl } from "@/lib/api";
import { getStoredAccessToken } from "@/utils/authStorage";
import type {
  Banner,
  BannerListParams,
  BannerPosition,
  CreateBannerPayload,
  PaginatedBannerResponse,
  TemporaryBannerImage,
  UpdateBannerPayload,
} from "@/types/banner";

interface ApiResponse<T> {
  payload: T;
  success: boolean;
  message: string;
  errors: string[];
  errorType: string;
}

class BannerService {
  async getHomeBanners(
    position?: BannerPosition,
  ): Promise<Banner[]> {
    const response = await apiInstance.GET("/api/banners/home" as any, {
      params: { query: position ? { position } : undefined },
    });

    const data = response.data as unknown as ApiResponse<Banner[]>;
    if (!data?.success) {
      throw new Error(data?.message || "Không thể tải banner trang chủ");
    }

    return data.payload || [];
  }

  async getBanners(
    params?: BannerListParams,
  ): Promise<PaginatedBannerResponse> {
    const response = await apiInstance.GET("/api/banners" as any, {
      params: { query: params as any },
    });

    const data = response.data as unknown as ApiResponse<PaginatedBannerResponse>;
    if (!data?.success) {
      throw new Error(data?.message || "Không thể tải danh sách banner");
    }

    return (
      data.payload || {
        items: [],
        pageNumber: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      }
    );
  }

  async getBannerById(bannerId: string): Promise<Banner> {
    const response = await apiInstance.GET(
      "/api/banners/{bannerId}" as any,
      {
        params: { path: { bannerId } },
      },
    );

    const data = response.data as unknown as ApiResponse<Banner>;
    if (!data?.success) {
      throw new Error(data?.message || "Không thể tải banner");
    }

    return data.payload;
  }

  async createBanner(payload: CreateBannerPayload): Promise<void> {
    const response = await apiInstance.POST("/api/banners" as any, {
      body: payload as any,
    });

    const data = response.data as unknown as ApiResponse<null>;
    if (!data?.success) {
      throw new Error(data?.message || "Không thể tạo banner");
    }
  }

  async updateBanner(
    bannerId: string,
    payload: UpdateBannerPayload,
  ): Promise<void> {
    const response = await apiInstance.PUT(
      "/api/banners/{bannerId}" as any,
      {
        params: { path: { bannerId } },
        body: payload as any,
      },
    );

    const data = response.data as unknown as ApiResponse<null>;
    if (!data?.success) {
      throw new Error(data?.message || "Không thể cập nhật banner");
    }
  }

  async deleteBanner(bannerId: string): Promise<void> {
    const response = await apiInstance.DELETE(
      "/api/banners/{bannerId}" as any,
      {
        params: { path: { bannerId } },
      },
    );

    const data = response.data as unknown as ApiResponse<null>;
    if (!data?.success) {
      throw new Error(data?.message || "Không thể xóa banner");
    }
  }

  async uploadTemporaryImages(
    files: File[],
  ): Promise<TemporaryBannerImage[]> {
    if (!files.length) {
      return [];
    }

    const accessToken = getStoredAccessToken();
    const baseUrl = getApiBaseUrl();
    const endpoint = `${baseUrl}/api/banners/images/temporary`;

    let lastErrorMessage = "Không thể tải hình ảnh tạm";

    const attemptUpload = async (
      buildFormData: (fileList: File[]) => FormData,
    ): Promise<TemporaryBannerImage[] | null> => {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
        body: buildFormData(files),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        lastErrorMessage =
          data?.message ||
          (Array.isArray(data?.errors) ? data.errors.join("; ") : "") ||
          lastErrorMessage;
        return null;
      }

      const payload = data.payload as
        | { data: TemporaryBannerImage[]; metadata: any }
        | TemporaryBannerImage[]
        | null;

      if (Array.isArray(payload)) {
        return payload;
      }

      return payload?.data || [];
    };

    // Strategy A: repeated "Images" key
    const strategyA = await attemptUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file) => {
        formData.append("Images", file);
      });
      return formData;
    });

    if (strategyA) {
      return strategyA;
    }

    // Strategy B: indexed "Images[i]"
    const strategyB = await attemptUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file, index) => {
        formData.append(`Images[${index}]`, file);
      });
      return formData;
    });

    if (strategyB) {
      return strategyB;
    }

    // Strategy C: indexed "Images[i].ImageFile"
    const strategyC = await attemptUpload((fileList) => {
      const formData = new FormData();
      fileList.forEach((file, index) => {
        formData.append(`Images[${index}].ImageFile`, file);
      });
      return formData;
    });

    if (strategyC) {
      return strategyC;
    }

    throw new Error(lastErrorMessage);
  }
}

export const bannerService = new BannerService();
