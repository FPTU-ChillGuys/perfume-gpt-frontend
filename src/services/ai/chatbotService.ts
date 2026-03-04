import { aiApiInstance } from "@/lib/api";
import type {
    ChatMessage,
    ConversationRequest,
    ConversationResponseData,
} from "@/types/chatbot";

class ChatbotService {
    private readonly CHAT_ENDPOINT = "/conversation/chat/v8";

    async sendMessage(
        conversationId: string,
        userId: string,
        messages: ChatMessage[]
    ): Promise<ConversationResponseData> {
        try {
            const body: ConversationRequest = {
                id: conversationId,
                userId,
                messages,
            };

            const response = await aiApiInstance.POST(this.CHAT_ENDPOINT, {
                body,
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Chatbot returned unsuccessful response"
                );
            }

            return response.data.data as ConversationResponseData;
        } catch (error: any) {
            console.error("Chatbot error:", error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Failed to connect to chatbot"
            );
        }
    }
}

export const chatbotService = new ChatbotService();
