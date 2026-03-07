import type { components } from "./api/v1";

export interface ReviewSummaryBase {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    variantId: string;
}

export interface ReviewSummaryStructuredResponse {
    success: boolean;
    data: {
        sentiment: string;
        key_themes: string[];
        pros: string[];
        cons: string[];
        rating_estimate: number;
    };
    __httpStatusCode?: number;
}

export interface ReviewSummaryResponse {
    success: boolean;
    data: string; // The raw summary text
    __httpStatusCode?: number;
}

export interface ReviewSummaryJobResponse {
    success: boolean;
    data: {
        jobId: string;
    };
    __httpStatusCode?: number;
}

export interface ReviewSummaryJobResultResponse {
    success: boolean;
    data: any; // Dynamic object like { status: 'pending' } or actual summary data
    __httpStatusCode?: number;
}

export interface ReviewSummaryAllResponse {
    success: boolean;
    data: ReviewSummaryBase[];
    __httpStatusCode?: number;
}

export interface ReviewLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    content: string;
    rating: number;
    platform: string;
}

export interface ReviewLogResponse {
    success: boolean;
    data: ReviewLog;
    __httpStatusCode?: number;
}

export interface ReviewLogListResponse {
    success: boolean;
    data: ReviewLog[];
    __httpStatusCode?: number;
}

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
export type ReviewDetailResponse = components["schemas"]["ReviewDetailResponse"];
export type ReviewStatisticsResponse = components["schemas"]["ReviewStatisticsResponse"];
export type ReviewStatus = components["schemas"]["ReviewStatus"];
export type PagedReviewList = components["schemas"]["PagedResultOfReviewListItem"];

export type CreateReviewRequest = components["schemas"]["CreateReviewRequest"];
export type UpdateReviewRequest = components["schemas"]["UpdateReviewRequest"];
export type ModerateReviewRequest = components["schemas"]["ModerateReviewRequest"];

export type BulkActionResultOfGuid = components["schemas"]["BulkActionResultOfGuid"];
export type BulkActionResultOfstring = components["schemas"]["BulkActionResultOfstring"];
export type BulkActionResultOfListOfTemporaryMediaResponse =
    components["schemas"]["BulkActionResultOfListOfTemporaryMediaResponse"];

export type TemporaryReviewMedia = components["schemas"]["TemporaryMediaResponse"];
export type ReviewMedia = components["schemas"]["MediaResponse"];

export interface ReviewDialogTarget {
    orderDetailId: string;
    variantId: string;
    variantName?: string;
    productName?: string;
    thumbnailUrl?: string | null;
}
