import { conversationStorage } from "./conversationStorage";
import { conversationService } from "@/services/ai/conversationService";
import { authService } from "@/services/authService";
import { getOrCreateGuestUserId } from "@/utils/guestUserId";
import type { ActiveConversation } from "./conversationStorage";
import type { ServerMessage } from "@/types/conversation";
import type { ChatMessage } from "@/types/chatbot";

function serverMessageToChatMessage(m: ServerMessage): ChatMessage {
    return { sender: m.sender, message: m.message };
}

function extractPreview(messages: ServerMessage[]): string {
    const firstUserMsg = messages.find((m) => m.sender === "user");
    if (!firstUserMsg) return "";
    return firstUserMsg.message.length > 60
        ? firstUserMsg.message.slice(0, 60)
        : firstUserMsg.message;
}

export const conversationSync = {
    async syncFromServer(): Promise<ActiveConversation[] | null> {
        try {
            const currentUser = authService.getCurrentUser();
            const userId = currentUser?.id ?? getOrCreateGuestUserId();
            const response = await conversationService.getMyHistory(userId, 1, 50);
            const items = response.data?.items ?? [];

            const now = Date.now();
            const localItems: ActiveConversation[] = items.map((item) => ({
                id: item.id,
                userId: item.userId,
                messages: (item.messages || []).map(serverMessageToChatMessage),
                updatedAt: new Date(item.updatedAt).getTime(),
                syncedAt: now,
                messageCount: item.messages?.length ?? 0,
                lastMessagePreview: extractPreview(item.messages || []),
            }));

            await conversationStorage.bulkUpsert(localItems);
            return localItems;
        } catch {
            return null;
        }
    },
};
