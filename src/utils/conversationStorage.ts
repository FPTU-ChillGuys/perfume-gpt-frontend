import Dexie, { type Table } from "dexie";
import type { ChatMessage } from "@/types/chatbot";

interface ActiveConversation {
    id: string;
    messages: ChatMessage[];
    updatedAt: number;
}

class ConversationDatabase extends Dexie {
    conversations!: Table<ActiveConversation, string>;

    constructor() {
        super("perfume_gpt_conversations");
        this.version(1).stores({
            conversations: "id, updatedAt",
        });
    }
}

const db = new ConversationDatabase();

export const conversationStorage = {
    async save(conversationId: string, messages: ChatMessage[]): Promise<void> {
        await db.conversations.put({
            id: conversationId,
            messages,
            updatedAt: Date.now(),
        });
    },

    async load(conversationId: string): Promise<ActiveConversation | null> {
        const record = await db.conversations.get(conversationId);
        return record ?? null;
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