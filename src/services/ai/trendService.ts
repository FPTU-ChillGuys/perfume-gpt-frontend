import { aiApiInstance } from "@/lib/api";
import type { ProductListItem } from "@/types/product";
import dayjs from "dayjs";

/**
 * Trả về Chủ nhật gần nhất (≤ referenceDate).
 * Nếu referenceDate đã là Chủ nhật thì trả về chính ngày đó.
 */
export const getLastSunday = (referenceDate: Date = new Date()): Date => {
    const d = dayjs(referenceDate);
    // dayjs: 0 = Sunday
    const daysFromSunday = d.day(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    return d.subtract(daysFromSunday, "day").toDate();
};

/**
 * Trả về Chủ nhật trước đó (7 ngày trước Chủ nhật gần nhất).
 */
export const getPrevSunday = (referenceDate: Date = new Date()): Date => {
    const lastSunday = getLastSunday(referenceDate);
    return dayjs(lastSunday).subtract(7, "day").toDate();
};

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
    ): Promise<ProductListItem[] | null> {
        try {
            const finalEndDate = endDate
                ? dayjs(endDate).format("YYYY-MM-DD")
                : dayjs(getLastSunday()).format("YYYY-MM-DD");
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
                return Array.isArray(jobInfo.data) ? jobInfo.data : [];
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
}

export const trendService = new TrendService();
