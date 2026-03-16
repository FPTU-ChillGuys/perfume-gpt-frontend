import type { BaseEntity } from "./common";

export interface BaseResponse<T = any> {
    success: boolean;
    message?: string;
    data: T;
}

export interface MessageEntity extends BaseEntity {
    sender: string;
    message: string;
    conversation: string;
    userMessageLog: any | null;
}

export interface QuizQuestionEntity extends BaseEntity {
    questionType: string;
    question: string;
}

export interface QuizAnswerEntity extends BaseEntity {
    answer: string;
    question: string;
}

export interface QuizQuesAnsDetail extends BaseEntity {
    question: QuizQuestionEntity;
    answer: QuizAnswerEntity;
    quesAns: string;
}

export interface UserMessageLog extends BaseEntity {
    message: MessageEntity;
    userLog: string;
}

export interface UserQuizLog extends BaseEntity {
    quizQuesAnsDetail: QuizQuesAnsDetail;
    userLog: string;
}

export interface UserSearchLog extends BaseEntity {
    searchQuery?: string;
    userLog: string;
    [key: string]: any;
}

export interface UserLog {
    id: string;
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
    isActive?: boolean;
    userId?: string | null;
    eventType?: "message" | "search" | "quiz" | "product" | null;
    entityType?: "conversation" | "search" | "quiz" | "product" | null;
    entityId?: string | null;
    contentText?: string | null;
    metadata?: Record<string, any> | null;
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
    isActive?: boolean;
    isDeleted?: boolean;
    userId: string;
    logSummary: string;
    featureSnapshot?: Record<string, unknown>;
    dailyLogSummary?: Record<string, string>;
    dailyFeatureSnapshot?: Record<string, unknown>;
    totalEvents: number;
    startDate?: string;
    endDate?: string;
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
