import { aiApiInstance } from "@/lib/api";
import type {
    ChatMessage,
    ConversationRequest,
    ConversationResponseData,
    ChatV11ResponseData,
} from "@/types/chatbot";

class ChatbotService {
    private readonly CHAT_ENDPOINT = "/conversation/chat/v10";

    async sendMessage(
        conversationId: string,
        userId: string,
        messages: ChatMessage[],
        isStaff: boolean = false
    ): Promise<ConversationResponseData> {
        try {
            const cleanMessages = messages.map(({ sender, message }) => ({ sender, message }));

            const body: ConversationRequest = {
                id: conversationId,
                userId,
                messages: cleanMessages,
                isStaff,
            };

            const endpoint = isStaff ? "/conversation/chat/v10-staff" : this.CHAT_ENDPOINT;

            const response = await aiApiInstance.POST(endpoint, {
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

    async sendMessageV11(
        conversationId: string,
        userId: string,
        messages: ChatMessage[],
        isStaff: boolean = false
    ): Promise<ChatV11ResponseData> {
        try {
            const cleanMessages = messages.map(({ sender, message }) => ({ sender, message }));

            const body: ConversationRequest = {
                id: conversationId,
                userId,
                messages: cleanMessages,
                isStaff,
            };

            const endpoint = isStaff ? "/conversation/chat/v11-staff" : "/conversation/chat/v11";

            const response = await aiApiInstance.POST(endpoint, { body });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Chatbot returned unsuccessful response"
                );
            }

            return response.data.data as ChatV11ResponseData;
        } catch (error: any) {
            console.error("Chatbot V11 error:", error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                "Failed to connect to chatbot"
            );
        }
    }
}

export const chatbotService = new ChatbotService();