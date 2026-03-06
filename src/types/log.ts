export interface BaseResponse<T = any> {
    success: boolean;
    message?: string;
    data: T;
}

export interface UserMessageLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    message: {
        id: string;
        createdAt: string;
        updatedAt: string;
        isActive: boolean;
        sender: string;
        message: string;
        conversation: string;
        userMessageLog: any | null;
    };
    userLog: string;
}

export interface UserQuizLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    quizQuesAnsDetail: {
        id: string;
        createdAt: string;
        updatedAt: string;
        isActive: boolean;
        question: {
            id: string;
            createdAt: string;
            updatedAt: string;
            isActive: boolean;
            questionType: string;
            question: string;
        };
        answer: {
            id: string;
            createdAt: string;
            updatedAt: string;
            isActive: boolean;
            answer: string;
            question: string;
        };
        quesAns: string;
    };
    userLog: string;
}

export interface UserSearchLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
    // Assuming structure based on similar logs, can refine later if needed
    searchQuery?: string;
    userLog: string;
    [key: string]: any;
}

export interface UserLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
    userId?: string | null;
    userMessageLogs?: UserMessageLog[];
    userQuizLogs?: UserQuizLog[];
    userSearchLogs?: UserSearchLog[];
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
