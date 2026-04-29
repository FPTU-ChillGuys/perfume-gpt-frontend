import { aiApiInstance } from "@/lib/api";
import type { AdminConversationListResponse, ConversationHistoryResponse } from "@/types/conversation";

class ConversationService {
    private readonly GET_ALL_ENDPOINT = "/conversation";
    private readonly MY_HISTORY_ENDPOINT = "/conversation/my/history";

    async getAllConversations(): Promise<AdminConversationListResponse> {
        try {
            const response = await aiApiInstance.GET(this.GET_ALL_ENDPOINT, {});

            if (!response.data) {
                throw new Error("No data returned from AI server");
            }

            return response.data as AdminConversationListResponse;
        } catch (error: any) {
            console.error("Failed to fetch all conversations:", error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Lỗi kết nối khi lấy danh sách hội thoại"
            );
        }
    }

    async getMyHistory(
        userId: string,
        pageNumber: number = 1,
        pageSize: number = 20
    ): Promise<ConversationHistoryResponse> {
        try {
            const response = await aiApiInstance.GET(this.MY_HISTORY_ENDPOINT, {
                params: {
                    query: { userId, PageNumber: pageNumber, PageSize: pageSize }
                }
            });

            if (!response.data) {
                throw new Error("No data returned from AI server");
            }

            return response.data as ConversationHistoryResponse;
        } catch (error: any) {
            console.error("Failed to fetch conversation history:", error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Lỗi kết nối khi lấy lịch sử hội thoại"
            );
        }
    }
}

export const conversationService = new ConversationService();
