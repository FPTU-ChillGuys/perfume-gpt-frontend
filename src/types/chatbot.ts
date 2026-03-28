import { z } from "zod";
import { productCardOutputItemSchema } from "./ai/product.output";

export interface ChatMessage {
    sender: "user" | "assistant";
    message: string;
    acceptanceId?: string; // Appended locally when AI generates products
}

export interface AiAcceptanceRecord {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    isAccepted: boolean;
}

export interface AiAcceptanceResponse {
    success: boolean;
    data: AiAcceptanceRecord;
}

export interface ChatVariant {
    id: string;
    sku: string;
    volumeMl: number;
    type: string;
    basePrice: number;
    status: string;
    concentrationName: string;
    totalQuantity: number | null;
    reservedQuantity: number | null;
}

export interface ChatProduct {
    id: string;
    name: string;
    description: string;
    brandName: string;
    categoryName: string;
    primaryImage: string | null;
    attributes: unknown[];
    variants?: ChatVariant[];
}

/** The JSON payload parsed from an assistant message string */
export interface AssistantPayload {
    message: string;
    products: ChatProduct[];
    suggestedQuestions?: string[];
}

export interface ConversationRequest {
    id: string;
    userId: string;
    messages: ChatMessage[];
}

export interface ConversationResponseData {
    id: string;
    userId: string;
    messages: ChatMessage[];
}

export interface ConversationResponse {
    success: boolean;
    data: ConversationResponseData;
    __httpStatusCode: number;
}

// ============ AI Output Schemas & Parsers ============
export const chatbotOutputItemSchema = z.object({
    message: z.string(),
    products: z.array(productCardOutputItemSchema)
});

export const chatbotOutputSchema = chatbotOutputItemSchema;
export type ChatbotOutputItem = z.infer<typeof chatbotOutputItemSchema>;

export const convertChatbotOutputToMessage = (output: unknown): ChatbotOutputItem | null => {
    try {
        const jsonOutput = typeof output === 'string' ? JSON.parse(output) : output;
        const parsedOutput = chatbotOutputSchema.safeParse(jsonOutput);

        if (!parsedOutput.success) {
            console.error('[Chatbot Output] Invalid structured output from AI.', parsedOutput.error.issues);
            console.warn('[Chatbot Output] Output format:', JSON.stringify(jsonOutput).substring(0, 200));
            return null;
        }

        return parsedOutput.data;
    } catch (error) {
        console.error('[Chatbot Output] Error parsing structured output:', error);
        return null;
    }
};
