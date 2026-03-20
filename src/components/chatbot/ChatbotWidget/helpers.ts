import type { ChatMessage, AssistantPayload } from "@/types/chatbot";

export function parseAssistantPayload(raw: string): AssistantPayload {
  try {
    return JSON.parse(raw) as AssistantPayload;
  } catch {
    return { message: raw, products: [] };
  }
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(price);
}

export const SILENCE_TIMEOUT = 3000; // 3 seconds
