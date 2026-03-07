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

    /**
     * Hàm tiện ích tích hợp vòng lặp polling tự động (Giống Trend Service)
     */
    async fetchReviewSummaryWithPolling(variantId: string): Promise<string> {
        try {
            // 1. Tạo Job
            const jobResponse = await this.createReviewSummaryJob(variantId);
            if (!jobResponse.data || !jobResponse.data.jobId) {
                throw new Error("Không thể khởi tạo job tóm tắt đánh giá.");
            }

            const jobId = jobResponse.data.jobId;

            // 2. Polling kết quả
            let retries = 0;
            const maxRetries = 1; // Thử 20 lần x 3s = 60s

            while (retries < maxRetries) {
                // await new Promise(resolve => setTimeout(resolve, 3000)); // Đợi 3s mỗi mốc

                const resultResponse = await this.getReviewSummaryJobResult(jobId, variantId);
                const jobInfo = resultResponse.data;

                if (jobInfo?.status === "completed") {
                    return jobInfo.data || "Không có nội dung đánh giá.";
                } else if (jobInfo?.status === "failed" || jobInfo?.status === "error") {
                    throw new Error("Quá trình tóm tắt bị lỗi tại máy chủ.");
                }

                // Nếu pending hoặc processing thì lặp lại
                retries++;
            }

            throw new Error("Hiện tại chưa có review bằng AI, bạn có thể chờ hoặc thử lại sau!");

        } catch (error: any) {
            console.error("Lỗi fetchReviewSummaryWithPolling:", error);
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
