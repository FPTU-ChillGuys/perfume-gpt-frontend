import { apiInstance } from "@/lib/api";
import { getStoredAccessToken } from "@/utils/authStorage";
import type {
  ReviewResponse,
  ReviewStatisticsResponse,
  ReviewStatus,
  PagedReviewList,
  CreateReviewRequest,
  UpdateReviewRequest,
  ModerateReviewRequest,
  BulkActionResultOfGuid,
  BulkActionResultOfstring,
  BulkActionResultOfListOfTemporaryMediaResponse,
  TemporaryReviewMedia,
  ReviewMedia,
  ReviewDetailResponse,
} from "@/types/review";

export type ReviewListQuery = {
  VariantId?: string;
  UserId?: string;
  Status?: ReviewStatus;
  MinRating?: number | null;
  MaxRating?: number | null;
  HasImages?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  IsDescending?: boolean;
};

class ProductReviewService {
  private createEmptyPagedResult(query?: ReviewListQuery): PagedReviewList {
    return {
      items: [],
      pageNumber: query?.PageNumber ?? 1,
      pageSize: query?.PageSize ?? 10,
      totalCount: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  }

  private extractErrorMessage(error: any, fallback: string) {
    return error?.response?.data?.message || error?.message || fallback;
  }

  async getMyReviews(): Promise<ReviewResponse[]> {
    try {
      const response = await apiInstance.GET("/api/reviews/me");

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể tải đánh giá của bạn",
        );
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching my reviews:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể tải đánh giá của bạn"),
      );
    }
  }

  async getReviews(query?: ReviewListQuery): Promise<PagedReviewList> {
    try {
      const response = await apiInstance.GET("/api/reviews", {
        params: { query },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể tải danh sách đánh giá",
        );
      }

      return response.data.payload || this.createEmptyPagedResult(query);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể tải danh sách đánh giá"),
      );
    }
  }

  async getReviewDetail(
    reviewId: string,
  ): Promise<ReviewDetailResponse | null> {
    try {
      const response = await apiInstance.GET("/api/reviews/{reviewId}", {
        params: { path: { reviewId } },
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể tải chi tiết đánh giá",
        );
      }

      return response.data.payload || null;
    } catch (error: any) {
      console.error("Error fetching review detail:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể tải chi tiết đánh giá"),
      );
    }
  }

  async getVariantReviews(variantId: string): Promise<ReviewResponse[]> {
    try {
      const response = await apiInstance.GET(
        "/api/reviews/variant/{variantId}",
        {
          params: { path: { variantId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể tải đánh giá cho sản phẩm này",
        );
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching variant reviews:", error);
      throw new Error(
        this.extractErrorMessage(
          error,
          "Không thể tải đánh giá cho sản phẩm này",
        ),
      );
    }
  }

  async getVariantStatistics(
    variantId: string,
  ): Promise<ReviewStatisticsResponse | null> {
    try {
      const response = await apiInstance.GET(
        "/api/reviews/variant/{variantId}/statistics",
        {
          params: { path: { variantId } },
        },
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể tải thống kê đánh giá",
        );
      }

      return response.data.payload || null;
    } catch (error: any) {
      console.error("Error fetching review statistics:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể tải thống kê đánh giá"),
      );
    }
  }

  async createReview(
    payload: CreateReviewRequest,
  ): Promise<BulkActionResultOfGuid> {
    try {
      const response = await apiInstance.POST("/api/reviews", {
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể gửi đánh giá");
      }

      return response.data.payload as BulkActionResultOfGuid;
    } catch (error: any) {
      console.error("Error creating review:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể gửi đánh giá"),
      );
    }
  }

  async updateReview(
    reviewId: string,
    payload: UpdateReviewRequest,
  ): Promise<BulkActionResultOfstring> {
    try {
      const accessToken = getStoredAccessToken();
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Không thể cập nhật đánh giá");
      }

      return (data.payload as BulkActionResultOfstring) || {};
    } catch (error: any) {
      console.error("Error updating review:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể cập nhật đánh giá"),
      );
    }
  }

  async deleteReview(reviewId: string): Promise<string> {
    try {
      const response = await apiInstance.DELETE("/api/reviews/{reviewId}", {
        params: { path: { reviewId } },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể xoá đánh giá");
      }

      return response.data.message || "Đã xoá đánh giá";
    } catch (error: any) {
      console.error("Error deleting review:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể xoá đánh giá"),
      );
    }
  }

  async moderateReview(
    reviewId: string,
    payload: ModerateReviewRequest,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/reviews/{reviewId}/answer",
        {
          params: { path: { reviewId } },
          body: {
            staffFeedbackComment: payload.reason || "",
          },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể duyệt đánh giá");
      }

      return response.data.message || "Đã cập nhật trạng thái đánh giá";
    } catch (error: any) {
      console.error("Error moderating review:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể duyệt đánh giá"),
      );
    }
  }

  async answerReview(
    reviewId: string,
    staffFeedbackComment: string,
  ): Promise<string> {
    try {
      const response = await apiInstance.POST(
        "/api/reviews/{reviewId}/answer",
        {
          params: { path: { reviewId } },
          body: { staffFeedbackComment },
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể gửi phản hồi");
      }

      return response.data.message || "Đã gửi phản hồi";
    } catch (error: any) {
      console.error("Error answering review:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể gửi phản hồi"),
      );
    }
  }

  async uploadTemporaryImages(files: File[]): Promise<TemporaryReviewMedia[]> {
    if (!files.length) {
      return [];
    }

    try {
      const accessToken = getStoredAccessToken();
      const endpoint = "/api/reviews/images/temporary";

      let lastErrorMessage = "Không thể tải ảnh tạm thời";

      const attemptUpload = async (
        buildFormData: (fileList: File[]) => FormData,
      ): Promise<TemporaryReviewMedia[] | null> => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
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
          | BulkActionResultOfListOfTemporaryMediaResponse
          | TemporaryReviewMedia[]
          | null;

        if (Array.isArray(payload)) {
          return payload;
        }

        return payload?.data || [];
      };

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
    } catch (error: any) {
      console.error("Error uploading review images:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể tải ảnh tạm thời"),
      );
    }
  }

  async getReviewImages(reviewId: string): Promise<ReviewMedia[]> {
    try {
      const response = await apiInstance.GET("/api/reviews/{reviewId}/images", {
        params: { path: { reviewId } },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể tải ảnh đánh giá");
      }

      return response.data.payload || [];
    } catch (error: any) {
      console.error("Error fetching review images:", error);
      throw new Error(
        this.extractErrorMessage(error, "Không thể tải ảnh đánh giá"),
      );
    }
  }
}

export const productReviewService = new ProductReviewService();
