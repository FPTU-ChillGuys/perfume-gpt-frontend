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
