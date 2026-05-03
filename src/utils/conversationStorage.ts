import Dexie, { type Table } from "dexie";
import type { ChatMessage } from "@/types/chatbot";

export interface ActiveConversation {
    id: string;
    userId: string;
    messages: ChatMessage[];
    updatedAt: number;
    syncedAt?: number;
    messageCount?: number;
    lastMessagePreview?: string;
}

class ConversationDatabase extends Dexie {
    conversations!: Table<ActiveConversation, string>;

    constructor() {
        super("perfume_gpt_conversations");
        this.version(1).stores({
            conversations: "id, updatedAt",
        });
        this.version(2).stores({
            conversations: "id, userId, updatedAt",
        });
    }
}

const db = new ConversationDatabase();

export const conversationStorage = {
    async save(
        conversationId: string,
        messages: ChatMessage[],
        options?: {
            userId?: string;
            syncedAt?: number;
            messageCount?: number;
            lastMessagePreview?: string;
        }
    ): Promise<void> {
        const messageCount = options?.messageCount ?? messages.length;
        const lastMessagePreview =
            options?.lastMessagePreview ??
            (() => {
                const firstUserMsg = messages.find((m) => m.sender === "user");
                const msg = firstUserMsg?.message;
                if (msg && msg.length > 60) return msg.slice(0, 60);
                return msg ?? "";
            })();

        await db.conversations.put({
            id: conversationId,
            userId: options?.userId ?? "",
            messages,
            updatedAt: Date.now(),
            syncedAt: options?.syncedAt,
            messageCount,
            lastMessagePreview,
        });
    },

    async load(conversationId: string): Promise<ActiveConversation | null> {
        const record = await db.conversations.get(conversationId);
        return record ?? null;
    },

    async getAllConversations(): Promise<ActiveConversation[]> {
        return await db.conversations.orderBy("updatedAt").reverse().toArray();
    },

    async getById(id: string): Promise<ActiveConversation | null> {
        const record = await db.conversations.get(id);
        return record ?? null;
    },

    async bulkUpsert(conversations: ActiveConversation[]): Promise<void> {
        await db.conversations.bulkPut(conversations);
    },

    async deleteByUserId(userId: string): Promise<void> {
        const records = await db.conversations
            .where("userId")
            .equals(userId)
            .toArray();
        const ids = records.map((r) => r.id);
        await db.conversations.bulkDelete(ids);
    },

    async getLatest(): Promise<ActiveConversation | null> {
        const latest = await db.conversations
            .orderBy("updatedAt")
            .reverse()
            .first();
        return latest ?? null;
    },

    async remove(conversationId: string): Promise<void> {
        await db.conversations.delete(conversationId);
    },

    async clear(): Promise<void> {
        await db.conversations.clear();
    },
};