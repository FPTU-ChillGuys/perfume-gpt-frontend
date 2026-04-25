import { apiInstance } from "@/lib/api";
import type { components } from "@/types/api/v1";

export type NotificationItem =
  components["schemas"]["NotificationListItemResponse"];

export type NotifiReferenceType =
  components["schemas"]["NotifiReferecneType"];

export interface GetNotificationsParams {
  targetRole?: string;
  isRead?: boolean;
  referenceType?: NotifiReferenceType;
  pageNumber?: number;
  pageSize?: number;
}

export interface PagedNotifications {
  items: NotificationItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages?: number;
}

class NotificationService {
  async getNotifications(
    params: GetNotificationsParams = {},
  ): Promise<PagedNotifications> {
    const response = await apiInstance.GET("/api/notifications", {
      params: {
        query: {
          TargetRole: params.targetRole,
          IsRead: params.isRead,
          PageNumber: params.pageNumber ?? 1,
          PageSize: params.pageSize ?? 20,
          SortBy: "CreatedAt",
          IsDescending: true,
        },
      },
    });
    if (!response.data?.success || !response.data.payload) {
      throw new Error(
        response.data?.message || "Failed to fetch notifications",
      );
    }
    const p = response.data.payload;

    // Client-side referenceType filter (API may not support it yet)
    let items = p.items ?? [];
    if (params.referenceType) {
      items = items.filter(
        (item) => item.referenceType === params.referenceType,
      );
    }

    return {
      items,
      totalCount: params.referenceType ? items.length : (p.totalCount ?? 0),
      pageNumber: p.pageNumber ?? 1,
      pageSize: p.pageSize ?? 20,
      totalPages: params.referenceType
        ? Math.ceil(items.length / (p.pageSize ?? 20))
        : p.totalPages,
    };
  }

  async markRead(id: string): Promise<void> {
    const response = await apiInstance.PATCH("/api/notifications/{id}/read", {
      params: { path: { id } },
    });
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to mark notification as read",
      );
    }
  }

  async markAllRead(): Promise<void> {
    const response = await apiInstance.PATCH("/api/notifications/read-all", {});
    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to mark all notifications as read",
      );
    }
  }
}

export const notificationService = new NotificationService();
