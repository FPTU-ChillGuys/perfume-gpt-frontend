import { aiApiInstance } from "@/lib/api";
import type { ProductListItem } from "@/types/product";
import { convertProductCardOutputToProducts, type ProductCardOutputItem } from "@/types/ai/product.output";
import dayjs from "dayjs";

// Các hàm hỗ trợ lấy ngày đã được cập nhật để sử dụng theo ngày thay vì tuần.

class TrendService {
    /**
     * Fetches trending products for the given period and endDate.
     * Returns `null` when the server job is still pending/processing (caller should fall back).
     * Returns an empty array only when the job completed but had no results.
     */
    async getTrendingProducts(
        period: "weekly" | "monthly" | "yearly" = "weekly",
        endDate?: string,
        startDate?: string,
        forceRefresh?: boolean,
    ): Promise<ProductListItem[] | null> {
        try {
            const finalEndDate = endDate
                ? dayjs(endDate).format("YYYY-MM-DD")
                : dayjs().format("YYYY-MM-DD");
            const finalStartDate = startDate
                ? dayjs(startDate).format("YYYY-MM-DD")
                : undefined;

            // 1. Khởi tạo job
            const jobResponse = await (aiApiInstance as any).GET("/trends/product/job", {
                params: {
                    query: {
                        period,
                        endDate: finalEndDate,
                        ...(finalStartDate ? { startDate: finalStartDate } : {}),
                        ...(forceRefresh ? { forceRefresh } : {}),
                    },
                },
            });

            if (!jobResponse.data?.success || !jobResponse.data?.data?.jobId) {
                throw new Error(jobResponse.data?.error || "Failed to create trend job");
            }

            const jobId = jobResponse.data.data.jobId;

            // 2. Kiểm tra trạng thái job một lần
            const statusResponse = await (aiApiInstance as any).GET("/trends/product/job/{jobId}", {
                params: { path: { jobId } },
            });

            const responseData = statusResponse.data;
            if (!responseData?.success) {
                throw new Error(responseData?.error || "Failed to check job status");
            }

            const jobInfo = responseData.data;
            if (jobInfo?.status === "completed") {
                const cardOutput = convertProductCardOutputToProducts(jobInfo.data);
                // Map AI output cards to ProductListItem format
                return cardOutput.map((card: ProductCardOutputItem) => ({
                    ...card,
                    displayPrice: card.variants?.[0]?.basePrice ?? 0,
                } as unknown as ProductListItem));
            } else if (jobInfo?.status === "failed" || jobInfo?.status === "error") {
                throw new Error("Trend job failed on server");
            }

            // Job vẫn đang xử lý (pending / processing) → báo hiệu cho caller
            return null;
        } catch (error: any) {
            console.warn("Error fetching trending products:", error);
            throw error;
        }
    }

    /**
     * Helper function: Cố gắng lấy xu hướng cho ngày hôm nay.
     * Nếu backend báo pending (về null), và không yêu cầu forceRefresh, thì lấy fallback (ngày hôm qua)
     * Trả về kết quả (hoặc empty array, hoặc null nếu cả 2 ngày đều đang processing).
     */
    async getCurrentOrPreviousDailyTrend(forceRefresh?: boolean): Promise<ProductListItem[] | null> {
        const today = dayjs().format("YYYY-MM-DD");
        const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

        let products = await this.getTrendingProducts("weekly", today, undefined, forceRefresh).catch((e) => {
            if (!forceRefresh) console.warn(e);
            return null;
        });

        if (products === null && !forceRefresh) {
            products = await this.getTrendingProducts("weekly", yesterday).catch(() => null);
        }

        return products;
    }
}

export const trendService = new TrendService();
