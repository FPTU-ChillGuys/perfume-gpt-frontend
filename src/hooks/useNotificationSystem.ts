import { useCallback, useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getStoredAccessToken } from "@/utils/authStorage";
import { isTokenExpired } from "@/utils/jwt";
import {
  notificationService,
  type NotificationItem,
} from "@/services/notificationService";


const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Hub URL resolution (mirrors pattern from useSignalR.ts)
// ---------------------------------------------------------------------------

const resolveNotificationHubUrl = (): string => {
  const explicit = (
    import.meta.env.VITE_NOTIFICATION_HUB_URL as string | undefined
  )
    ?.trim()
    .replace(/\/+$/, "");

  const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?.trim()
    .replace(/\/+$/, "");

  const resolveFromBase = (path: string, base?: string) => {
    if (!base) return undefined;
    try {
      return new URL(path, new URL(base).origin + "/").toString();
    } catch {
      return undefined;
    }
  };

  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) return explicit;
    const fromBase = resolveFromBase(explicit, baseUrl);
    if (fromBase) return fromBase;
    if (typeof window !== "undefined") {
      try {
        return new URL(explicit, `${window.location.origin}/`).toString();
      } catch {
        return `${window.location.origin}${explicit.startsWith("/") ? "" : "/"}${explicit}`;
      }
    }
    return explicit;
  }

  if (baseUrl) {
    return (
      resolveFromBase("/hubs/notifications", baseUrl) ??
      `${baseUrl}/hubs/notifications`
    );
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/hubs/notifications`;
  }

  return "/hubs/notifications";
};

const NOTIFICATION_HUB_URL = resolveNotificationHubUrl();

// ---------------------------------------------------------------------------
// Token helper
// ---------------------------------------------------------------------------

const getValidToken = (): string => {
  const raw = getStoredAccessToken();
  if (!raw) return "";
  const token = raw
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^"|"$/g, "");
  if (!token || isTokenExpired(token)) return "";
  return token;
};

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export interface UseNotificationSystemOptions {
  /** 'admin' | 'staff' | 'user' (customer) */
  userRole: string;
  userId?: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useNotificationSystem = ({
  userRole,
  userId,
}: UseNotificationSystemOptions) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Derive the SignalR event name and API filter based on role
  const isBackOffice = userRole === "admin" || userRole === "staff";
  const signalREvent = isBackOffice
    ? "ReceiveRoleNotification"
    : "ReceiveUserNotification";
  const targetRoleParam = isBackOffice ? userRole : undefined;

  // -----------------------------------------------------------------------
  // Effect 1 — fetch initial notifications via REST
  // -----------------------------------------------------------------------

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await notificationService.getNotifications({
        targetRole: targetRoleParam,
        pageSize: PAGE_SIZE,
      });
      setNotifications(result.items);
      setUnreadCount(result.items.filter((n) => !n.isRead).length);
    } catch {
      // Silently fail — keep previous state
    }
  }, [targetRoleParam]);

  useEffect(() => {
    if (!userRole || (!isBackOffice && !userId)) return;
    let cancelled = false;

    const load = async () => {
      const result = await notificationService
        .getNotifications({ targetRole: targetRoleParam, pageSize: PAGE_SIZE })
        .catch(() => null);
      if (cancelled || !result) return;
      setNotifications(result.items);
      setUnreadCount(result.items.filter((n) => !n.isRead).length);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isBackOffice, targetRoleParam, userId, userRole]);

  // -----------------------------------------------------------------------
  // Effect 2 — SignalR real-time listener
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!userRole || (!isBackOffice && !userId)) return;

    let isMounted = true;

    const setup = async () => {
      const token = getValidToken();
      if (!token) return;

      // Determine if ngrok header is needed
      let shouldBypassNgrok = false;
      try {
        const parsed = new URL(NOTIFICATION_HUB_URL);
        shouldBypassNgrok =
          parsed.hostname.includes("ngrok.io") ||
          parsed.hostname.includes("ngrok-free.app") ||
          parsed.hostname.includes("ngrok-free.dev");
      } catch {
        shouldBypassNgrok = false;
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(NOTIFICATION_HUB_URL, {
          accessTokenFactory: () => getValidToken(),
          headers: shouldBypassNgrok
            ? { "ngrok-skip-browser-warning": "true" }
            : undefined,
        })
        .configureLogging(signalR.LogLevel.Warning)
        .withAutomaticReconnect()
        .build();

      // Listen for the role-appropriate event
      connection.on(signalREvent, (payload: NotificationItem) => {
        if (!isMounted) return;

        setNotifications((prev) => [payload, ...prev].slice(0, PAGE_SIZE));
        setUnreadCount((prev) => prev + 1);
      });

      connection.onclose(() => {
        // Connection closed — no-op, auto-reconnect handles it
      });

      try {
        await connection.start();
        if (!isMounted) {
          await connection.stop();
          return;
        }
        connectionRef.current = connection;
      } catch {
        // Connection failed — will retry via withAutomaticReconnect
      }
    };

    void setup();

    return () => {
      isMounted = false;
      const conn = connectionRef.current;
      connectionRef.current = null;
      if (conn) {
        void conn.stop();
      }
    };
  }, [isBackOffice, signalREvent, userId, userRole]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, []);

  const refetch = useCallback(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch,
  };
};
