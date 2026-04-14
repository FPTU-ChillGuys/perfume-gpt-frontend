import type { UserLog } from "@/types/log";

const EVENT_TYPE_LABELS: Record<string, string> = {
  message: "Tin nhan",
  search: "Tim kiem",
  survey: "Survey",
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
