export interface ChatMessage {
    sender: "user" | "assistant";
    message: string;
    acceptanceId?: string; // Appended locally when AI generates products
}

export interface AiAcceptanceRecord {
    id: string;
    createdAt: string;
    updatedAt: string;
    isAccepted: boolean;
    status: 'accepted' | 'rejected' | 'pending';
    visibleAfterAt?: string;
    contextType?: string | null;
    sourceRefId?: string | null;
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
    aiAcceptanceId?: string;
    attributes: unknown[];
    variants?: ChatVariant[];
}

/** The JSON payload parsed from an assistant message string */
export interface AssistantPayload {
    message: string;
    products: ChatProduct[];
    suggestedQuestions: string[];
}

export interface ConversationRequest {
    id: string;
    userId: string;
    messages: ChatMessage[];
    isStaff?: boolean;
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

export interface ChatV11AiMessage {
    sender: "assistant";
    message: string;
    createdAt: string;
}

export interface ChatV11ResponseData {
    conversationId: string;
    aiMessage: ChatV11AiMessage;
    aiAcceptanceId?: string;
}

export interface ChatV11Response {
    success: boolean;
    data: ChatV11ResponseData;
    __httpStatusCode?: number;
}