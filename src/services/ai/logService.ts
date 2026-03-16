import { aiApiInstance } from "@/lib/api";
import type {
    UserLog,
    UserLogSummaryResponse,
    AllUserLogRequest,
    LogSummaryRequest,
    LogSummaryAllRequest,
    UserLogSummaryRequest,
    BaseResponse,
} from "../../types/log";

export class LogService {
    /**
     * Lấy tất cả log hoạt động người dùng
     */
    async getAllUserLogs(): Promise<UserLog[]> {
        const { data, error } = await aiApiInstance.GET("/logs/all", {});
        if (error) throw new Error(error.message || "Failed to fetch logs");
        return (data as BaseResponse<UserLog[]>).data;
    }

    /**
     * Lấy tất cả log hoạt động người dùng theo khoảng thời gian
     */
    async getUserLogsWithPeriod(params: AllUserLogRequest): Promise<UserLog[]> {
        const { data, error } = await aiApiInstance.GET("/logs/all/period", {
            params: { query: params as any },
        });
        if (error) throw new Error(error.message || "Failed to fetch logs with period");
        return (data as BaseResponse<UserLog[]>).data;
    }

    /**
     * Lấy tất cả bản tóm tắt log người dùng
     */
    async getAllUserLogsSummaries(): Promise<UserLogSummaryResponse[]> {
        const { data, error } = await aiApiInstance.GET("/logs/summaries", {});
        if (error) throw new Error(error.message || "Failed to fetch user log summaries");
        return (data as BaseResponse<UserLogSummaryResponse[]>).data;
    }

    /**
     * Xem chi tiết các bản tóm tắt log người dùng theo ID và khoảng thời gian
     */
    async getUserLogsSummariesById(
        userId: string,
        endDate: string,
        startDate: string
    ): Promise<UserLogSummaryResponse[]> {
        const { data, error } = await aiApiInstance.GET("/logs/summaries", {
            params: { query: { userId, endDate, startDate } },
        });
        if (error) throw new Error(error.message || "Failed to fetch user log summaries");
        return (data as BaseResponse<UserLogSummaryResponse[]>).data;
    }

    /**
     * Xem báo cáo tóm tắt log người dùng theo ID (trả về String[])
     */
    async getUserLogsSummaryReportById(
        userId: string,
        endDate: string,
        startDate: string
    ): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/report/summary", {
            params: { query: { userId, endDate, startDate } },
        });
        if (error) throw new Error(error.message || "Failed to fetch user log summary report");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Lấy báo cáo tất cả log hoạt động người dùng (trả về array string)
     */
    async getReportFromAllLogs(params: AllUserLogRequest): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/report/activity/all", {
            params: { query: params as any },
        });
        if (error) throw new Error(error.message || "Failed to fetch all logs report");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Lấy báo cáo log hoạt động người dùng cụ thể
     */
    async collectLogs(params: LogSummaryRequest): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/report/activity/user", {
            params: { query: params as any },
        });
        if (error) throw new Error(error.message || "Failed to collect logs");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Tóm tắt log người dùng bằng AI
     */
    async summarizeLogs(params: LogSummaryRequest): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/summarize", {
            params: { query: params as any },
        });
        if (error) throw new Error(error.message || "Failed to summarize logs");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Tóm tắt log tất cả người dùng bằng AI
     */
    async summarizeAllLogs(params: LogSummaryAllRequest): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/summarize/all", {
            params: { query: params as any },
        });
        if (error) throw new Error(error.message || "Failed to summarize all logs");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Tóm tắt log người dùng hàng tuần (thủ công)
     */
    async summaryLogsPerWeekManually(): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/summarize/weekly/manual", {});
        if (error) throw new Error(error.message || "Failed to summarize logs weekly manually");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Tóm tắt log người dùng hàng tháng (thủ công)
     */
    async summaryLogsPerMonthManually(): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/summarize/month/manual", {});
        if (error) throw new Error(error.message || "Failed to summarize logs month manually");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Tóm tắt log người dùng hàng năm (thủ công)
     */
    async summaryLogsPerYearManually(): Promise<string[]> {
        const { data, error } = await aiApiInstance.GET("/logs/summarize/year/manual", {});
        if (error) throw new Error(error.message || "Failed to summarize logs year manually");
        return (data as BaseResponse<string[]>).data;
    }

    /**
     * Tạo bản tóm tắt log người dùng thủ công
     */
    async createUserLogSummary(body: UserLogSummaryRequest): Promise<string[]> {
        const { data, error } = await aiApiInstance.POST("/logs", {
            body: body as any,
        });
        if (error) throw new Error(error.message || "Failed to create user log summary");
        return (data as BaseResponse<string[]>).data;
    }
}

export const logService = new LogService();
