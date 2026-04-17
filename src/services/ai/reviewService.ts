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
    // ----------------------
    // Summary Methods
    // ----------------------


    /**
     * Lấy tóm tắt review mới nhất trực tiếp (Thay thế polling job cũ)
     */
    async fetchReviewSummaryWithPolling(variantId: string): Promise<string> {
        try {
            const response = await this.getLatestReviewLogByVariant(variantId);
            return response.payload?.reviewLog || response.data?.reviewLog || "Không có nội dung đánh giá.";
        } catch (error: any) {
            console.error("Lỗi fetchReviewSummaryWithPolling:", error);
            // Nếu là lỗi 404 hoặc không tìm thấy, trả về thông báo thân thiện thay vì ném lỗi
            if (error.message?.includes("404") || error.message?.includes("không tìm thấy")) {
                return "Hiện tại chưa có đánh giá nào cho phiên bản này.";
            }
            throw new Error(error.message || "Lỗi tải tóm tắt đánh giá.");
        }
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

    async getLatestReviewLogByVariant(variantId: string): Promise<ReviewLogResponse> {
        return this.handleResponse(
            await aiApiInstance.GET("/reviews/logs/latest/variant/{variantId}", {
                params: { path: { variantId } }
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
