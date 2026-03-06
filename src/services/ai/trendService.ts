import { aiApiInstance } from "@/lib/api";
import type { ProductListItem } from "@/types/product";
import dayjs from "dayjs";

class TrendService {
    async getTrendingProducts(period: "weekly" | "monthly" | "yearly" = "weekly", endDate: string = dayjs().startOf("day").toISOString(), startDate?: string,): Promise<ProductListItem[]> {
        try {
            // 1. Khởi tạo job
            const jobResponse = await (aiApiInstance as any).GET("/trends/product/job", {
                params: {
                    query: {
                        period,
                        ...(endDate ? { endDate } : {}),
                        ...(startDate ? { startDate } : {})
                    }
                }
            });

            if (!jobResponse.data?.success || !jobResponse.data?.data?.jobId) {
                throw new Error(jobResponse.data?.error || "Failed to create trend job");
            }

            const jobId = jobResponse.data.data.jobId;

            // 2. Polling kiểm tra trạng thái job
            let retries = 0;
            const maxRetries = 20; // 20 lần thử x 3s = 60s

            while (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Đợi 3 giây

                const statusResponse = await (aiApiInstance as any).GET("/trends/product/job/{jobId}", {
                    params: {
                        path: { jobId }
                    }
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

                // Nếu "processing" hoặc "pending", tiếp tục loop
                retries++;
            }

            throw new Error("Trend job polling timed out");
        } catch (error: any) {
            console.error("Error fetching trending products via job:", error);
            throw new Error(error.response?.data?.error || error.message || "Failed to fetch trending products");
        }
    }
}

export const trendService = new TrendService();
