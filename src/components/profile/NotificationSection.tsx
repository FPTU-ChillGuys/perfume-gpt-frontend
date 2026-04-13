import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Pagination,
} from "@mui/material";
import {
  DoneAll as DoneAllIcon,
  Circle as CircleIcon,
} from "@mui/icons-material";
import {
  notificationService,
  type NotificationItem,
} from "@/services/notificationService";
import { useToast } from "@/hooks/useToast";
import { parseServerDate } from "@/utils/dateTime";

const PAGE_SIZE = 10;

const formatTime = (value?: string | null): string => {
  const date = parseServerDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const typeColorMap: Record<
  string,
  "info" | "warning" | "error" | "success" | "secondary"
> = {
  Info: "info",
  Warning: "warning",
  Error: "error",
  Success: "success",
  Promotional: "secondary",
};

export const NotificationSection = () => {
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async (pageNumber: number) => {
    setIsLoading(true);
    setError("");
    try {
      const data = await notificationService.getNotifications({
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setNotifications(data.items);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages ?? Math.ceil(data.totalCount / PAGE_SIZE));
    } catch (err: any) {
      setError(err?.message || "Không thể tải thông báo");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (err: any) {
      showToast(err?.message || "Không thể đánh dấu đã đọc", "error");
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast("Đã đánh dấu tất cả là đã đọc", "success");
    } catch (err: any) {
      showToast(err?.message || "Không thể đánh dấu tất cả đã đọc", "error");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading && notifications.length === 0) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box py={4}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={() => fetchNotifications(page)}>
          Thử lại
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight="bold">
            Thông Báo
          </Typography>
          <Chip
            label={totalCount}
            size="small"
            color="default"
            variant="outlined"
          />
        </Box>
        {unreadCount > 0 && (
          <Button
            size="small"
            startIcon={<DoneAllIcon />}
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}
          </Button>
        )}
      </Box>

      <Divider />

      {notifications.length === 0 ? (
        <Box py={6} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Bạn chưa có thông báo nào.
          </Typography>
        </Box>
      ) : (
        <>
          <List disablePadding>
            {notifications.map((notification) => (
              <ListItemButton
                key={notification.id}
                onClick={() => {
                  if (!notification.isRead && notification.id) {
                    handleMarkAsRead(notification.id);
                  }
                }}
                sx={{
                  py: 1.5,
                  px: 2,
                  bgcolor: notification.isRead ? "transparent" : "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  alignItems: "flex-start",
                  gap: 1.5,
                }}
              >
                {/* Unread dot */}
                <Box
                  sx={{
                    pt: 0.8,
                    minWidth: 12,
                    display: "flex",
                    alignItems: "flex-start",
                  }}
                >
                  {!notification.isRead && (
                    <CircleIcon sx={{ fontSize: 8, color: "primary.main" }} />
                  )}
                </Box>

                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={0.3}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notification.isRead ? "normal" : "bold",
                        }}
                      >
                        {notification.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        mt={0.5}
                        display="block"
                      >
                        {formatTime(notification.createdAt)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
