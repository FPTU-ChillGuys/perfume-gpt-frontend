import { apiInstance } from "@/lib/api";
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
      const response = await apiInstance.PUT("/api/reviews/{reviewId}", {
        params: { path: { reviewId } },
        body: payload,
      });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Không thể cập nhật đánh giá",
        );
      }

      return response.data.payload as BulkActionResultOfstring;
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
      const response = await apiInstance.PUT("/api/reviews/{reviewId}", {
        params: { path: { reviewId } },
        body: {
          comment: payload.reason || "",
        },
      });

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

  async uploadTemporaryImages(files: File[]): Promise<TemporaryReviewMedia[]> {
    if (!files.length) {
      return [];
    }

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("Images", file));

      const response = await apiInstance.POST("/api/reviews/images/temporary", {
        body: { Images: [] },
        bodySerializer() {
          return formData;
        },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Không thể tải ảnh tạm thời");
      }

      const payload = response.data
        .payload as BulkActionResultOfListOfTemporaryMediaResponse;

      return payload?.data || [];
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
