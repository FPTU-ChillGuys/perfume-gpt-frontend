import type { ChatMessage } from "./chatbot";

export interface AdminConversation {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    messages: ChatMessage[];
}

export interface AdminConversationListResponse {
    success: boolean;
    data: AdminConversation[];
    __httpStatusCode?: number;
}
