import { aiApiInstance } from "@/lib/api";
import type {
    ReviewSummaryAllResponse,
    ReviewSummaryResponse,
    ReviewSummaryStructuredResponse,
    ReviewLogListResponse,
    ReviewLogResponse,
    CreateReviewLogDto
} from "@/types/review";

class ReviewService {
    async getAllReviewSummaries(): Promise<ReviewSummaryAllResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/reviews/summary/all", {})
        );
    }

    async getReviewSummaryByVariant(variantId: string): Promise<ReviewSummaryResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/reviews/summary/{variantId}", {
                params: { path: { variantId } }
            })
        );
    }

    async getStructuredReviewSummaryByVariant(variantId: string): Promise<ReviewSummaryStructuredResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/reviews/summary/structured/{variantId}", {
                params: { path: { variantId } }
            })
        );
    }

    async createReviewLog(data: CreateReviewLogDto): Promise<ReviewLogResponse> {
        return this.handleResponse(
            await aiApiInstance.POST("/reviews/logs", {
                body: data
            })
        );
    }

    async getAllReviewLogs(): Promise<ReviewLogListResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/reviews/logs", {})
        );
    }

    async getReviewLogsByVariant(variantId: string): Promise<ReviewLogListResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/reviews/logs/variant/{variantId}", {
                params: { path: { variantId } }
            })
        );
    }

    async getReviewLogById(id: string): Promise<ReviewLogResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/reviews/logs/{id}", {
                params: { path: { id } }
            })
        );
    }

    private handleResponse(response: any) {
        if (!response.data || !response.data.success) {
            throw new Error(
                response.data?.message || "Lỗi tương tác với Review API"
            );
        }
        return response.data;
    }
}

export const reviewService = new ReviewService();
