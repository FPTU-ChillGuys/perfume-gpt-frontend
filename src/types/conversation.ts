export interface ServerMessage {
    id: string;
    sender: "user" | "assistant";
    message: string;
    createdAt: string;
}

export interface AdminConversation {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    userName?: string;
    messages: ServerMessage[];
}

export interface AdminConversationListResponse {
    success: boolean;
    data: AdminConversation[];
    __httpStatusCode?: number;
}

export interface ConversationHistoryItem {
    id: string;
    userId: string;
    updatedAt: string;
    messages: ServerMessage[];
}

export interface ConversationHistoryResponse {
    success: boolean;
    data: {
        items: ConversationHistoryItem[];
        pageNumber: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
}
