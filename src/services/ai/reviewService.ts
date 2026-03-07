import { aiApiInstance } from "@/lib/api";
import type {
    ReviewSummaryAllResponse,
    ReviewSummaryResponse,
    ReviewSummaryStructuredResponse,
    ReviewSummaryJobResponse,
    ReviewSummaryJobResultResponse,
    ReviewLogListResponse,
    ReviewLogResponse,
    CreateReviewLogDto
} from "@/types/review";

class ReviewService {
    // ----------------------
    // Summary Methods
    // ----------------------

    /**
     * Khởi tạo job để tóm tắt đánh giá theo variant ID
     */
    async createReviewSummaryJob(variantId: string): Promise<ReviewSummaryJobResponse> {
        return this.handleResponse(
            await (aiApiInstance as any).GET("/reviews/summary/job/{variantId}", {
                params: { path: { variantId } }
            })
        );
    }

    /**
     * Kiểm tra trạng thái hoàn thành của job tóm tắt đánh giá
     */
    async getReviewSummaryJobResult(jobId: string, variantId: string): Promise<ReviewSummaryJobResultResponse> {
        return this.handleResponse(
            await (aiApiInstance as any).GET("/reviews/summary/job/result/{jobId}", {
                params: {
                    path: { jobId },
                    query: { variantId }
                }
            })
        );
    }

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
