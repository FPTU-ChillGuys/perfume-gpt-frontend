export interface BaseResponse<T = any> {
    success: boolean;
    message?: string;
    data: T;
}

export interface UserLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
    userId?: string | null;
    userMessageLogs?: any[];
    userQuizLogs?: any[];
    userSearchLogs?: any[];
}

export interface UserLogSummaryRequest {
    userId: string;
    startDate: string;
    endDate: string;
    logSummary: string;
}

export interface UserLogSummaryResponse {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    startDate: string;
    endDate: string;
    logSummary: string;
}

export type LogPeriod = "weekly" | "monthly" | "yearly";

export interface AllUserLogRequest {
    period: LogPeriod;
    endDate: string;
    startDate?: string;
}

export interface LogSummaryRequest {
    userId: string;
    period: LogPeriod;
    endDate: string;
    startDate?: string;
}

export interface LogSummaryAllRequest {
    period: LogPeriod;
    endDate: string;
    startDate?: string;
}
