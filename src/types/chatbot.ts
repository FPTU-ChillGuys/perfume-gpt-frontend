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
