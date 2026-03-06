import { aiApiInstance } from "@/lib/api";
import type { AdminConversationListResponse } from "@/types/conversation";

class ConversationService {
    // Standard endpoint to get all conversations. Will wait for the backend if this differs.
    private readonly GET_ALL_ENDPOINT = "/conversation";

    async getAllConversations(): Promise<AdminConversationListResponse> {
        try {
            // Note: Second argument matches the openapi-fetch signature
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
}

export const conversationService = new ConversationService();
