import type { components } from "./api/v1";
import type { ApiResponse, BaseEntity } from "./common";

export interface ReviewSummaryBase extends BaseEntity {
  variantId: string;
}

export interface ReviewSummarySentiment {
  sentiment: string;
  key_themes: string[];
  pros: string[];
  cons: string[];
  rating_estimate: number;
}

export interface ReviewLog extends BaseEntity {
  content: string;
  rating: number;
  platform: string;
}

// Response type aliases — use ApiResponse<T> generics instead of repeating the shape
export type ReviewSummaryStructuredResponse =
  ApiResponse<ReviewSummarySentiment>;
export type ReviewSummaryResponse = ApiResponse<string>;
export type ReviewSummaryJobResponse = ApiResponse<{ jobId: string }>;
export type ReviewSummaryJobResultResponse = ApiResponse<any>;
export type ReviewSummaryAllResponse = ApiResponse<ReviewSummaryBase[]>;
export type ReviewLogResponse = ApiResponse<ReviewLog>;
export type ReviewLogListResponse = ApiResponse<ReviewLog[]>;

export interface CreateReviewLogDto {
  content: string;
  rating: number;
  platform: string;
  variantId: string;
}

// ----------------------
// E-commerce Review Types
// ----------------------

export type ReviewResponse = components["schemas"]["ReviewResponse"];
export type ReviewListItem = components["schemas"]["ReviewListItem"];
export type ReviewDetailResponse =
  components["schemas"]["ReviewDetailResponse"];
export type ReviewStatisticsResponse =
  components["schemas"]["ReviewStatisticsResponse"];
export type ReviewStatus = "Pending" | "Approved" | "Rejected";
export type PagedReviewList =
  components["schemas"]["PagedResultOfReviewListItem"];

export type CreateReviewRequest = components["schemas"]["CreateReviewRequest"];
export type UpdateReviewRequest = components["schemas"]["UpdateReviewRequest"];
export interface ModerateReviewRequest {
  status: ReviewStatus;
  reason?: string;
}

export type ReviewWithOptionalStatus = ReviewResponse & {
  status?: ReviewStatus;
};

export const getReviewStatus = (review?: ReviewResponse | null) =>
  (review as ReviewWithOptionalStatus | null | undefined)?.status;

export type BulkActionResultOfGuid =
  components["schemas"]["BulkActionResultOfGuid"];
export type BulkActionResultOfstring =
  components["schemas"]["BulkActionResultOfstring"];
export type BulkActionResultOfListOfTemporaryMediaResponse =
  components["schemas"]["BulkActionResultOfListOfTemporaryMediaResponse"];

export type TemporaryReviewMedia =
  components["schemas"]["TemporaryMediaResponse"];
export type ReviewMedia = components["schemas"]["MediaResponse"];

export interface ReviewDialogTarget {
  orderDetailId: string;
  variantId: string;
  variantName?: string;
  productName?: string;
  thumbnailUrl?: string | null;
}
