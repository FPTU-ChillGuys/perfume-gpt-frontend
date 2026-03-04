import type {
    ChatMessage,
    ConversationRequest,
    ConversationResponseData,
} from "@/types/chatbot";

const CHATBOT_BASE_URL =
    import.meta.env.VITE_CHATBOT_BASE_URL || "http://localhost:3000";

class ChatbotService {
    private readonly endpoint = `${CHATBOT_BASE_URL}/conversation/chat/v8`;

    async sendMessage(
        conversationId: string,
        userId: string,
        messages: ChatMessage[]
    ): Promise<ConversationResponseData> {
        const accessToken = localStorage.getItem("accessToken");

        const body: ConversationRequest = {
            id: conversationId,
            userId,
            messages,
        };

        const response = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Chatbot API error: ${response.status}`);
        }

        const json = await response.json();

        if (!json.success) {
            throw new Error("Chatbot returned unsuccessful response");
        }

        return json.data as ConversationResponseData;
    }
}

export const chatbotService = new ChatbotService();
