import type { ChatMessage, AssistantPayload, ChatProduct } from "@/types/chatbot";
import type { ProductCardOutputItem } from "@/types/ai/product.output";

export function parseAssistantPayload(raw: string): AssistantPayload {
  try {
    const parsed = JSON.parse(raw) as any;
    
    // Handle new ProductCardOutputItem format from AI
    if (parsed.products && Array.isArray(parsed.products)) {
      const products: ChatProduct[] = parsed.products.map((item: ProductCardOutputItem) => ({
        id: item.id,
        name: item.name,
        brandName: item.brandName,
        primaryImage: item.primaryImage,
        categoryName: item.brandName, // Use brandName as categoryName fallback
        description: "", // Not provided by new schema
        attributes: [], // Not provided by new schema
        variants: item.variants?.map(v => ({
          id: v.id,
          sku: v.sku,
          volumeMl: v.volumeMl,
          basePrice: v.basePrice,
          type: "", // Not provided
          status: "", // Not provided
          concentrationName: "", // Not provided
          totalQuantity: null,
          reservedQuantity: null,
        })) || [],
      }));
      
      return {
        message: parsed.message || raw,
        products,
      };
    }
    
    return parsed as AssistantPayload;
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
