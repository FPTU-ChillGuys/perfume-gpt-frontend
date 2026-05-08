import type { UserLog } from "@/types/log";

const EVENT_TYPE_LABELS: Record<string, string> = {
  message: "Tin nhắn",
  search: "Tìm kiếm",
  survey: "Khảo sát",
  product: "Sản phẩm",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  conversation: "Cuộc trò chuyện",
  search: "Tìm kiếm",
  survey: "Khảo sát",
  product: "Sản phẩm",
};

export const getUserLogEventTypeLabel = (
  eventType?: UserLog["eventType"],
): string => {
  if (!eventType) {
    return "N/A";
  }

  return EVENT_TYPE_LABELS[eventType] ?? "N/A";
};

export const getUserLogEntityTypeLabel = (
  entityType?: UserLog["entityType"],
): string => {
  if (!entityType) {
    return "N/A";
  }

  return ENTITY_TYPE_LABELS[entityType] ?? "N/A";
};
