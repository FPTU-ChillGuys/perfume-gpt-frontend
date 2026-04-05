import { apiInstance } from "@/lib/api";

class NotificationService {
  async markRead(id: string): Promise<void> {
    const response = await apiInstance.PATCH("/api/notifications/{id}/read", {
      params: { path: { id } },
    });
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to mark notification as read");
    }
  }

  async markAllRead(): Promise<void> {
    const response = await apiInstance.PATCH("/api/notifications/read-all", {});
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Failed to mark all notifications as read");
    }
  }
}

export const notificationService = new NotificationService();
