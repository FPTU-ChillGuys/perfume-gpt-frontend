import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from "@mui/material";
import {
  NotificationsNone as NotificationsNoneIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";
import {
  notificationService,
  type NotificationItem,
} from "@/services/notificationService";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTimeCompactVN } from "@/utils/dateTime";

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 20;

export const AdminNotificationBell = () => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetRole = user?.role === "admin" ? "admin" : "staff";

  const fetchNotifications = useCallback(async () => {
    try {
      const [allResult, unreadResult] = await Promise.all([
        notificationService.getNotifications({
          targetRole,
          pageSize: PAGE_SIZE,
        }),
        notificationService.getNotifications({
          targetRole,
          isRead: false,
          pageSize: 1,
        }),
      ]);
      setNotifications(allResult.items);
      setUnreadCount(unreadResult.totalCount);
    } catch {
      // Silently fail – bell stays with previous state
    }
  }, [targetRole]);

  // Initial fetch + polling
  useEffect(() => {
    void fetchNotifications();

    pollTimerRef.current = setInterval(() => {
      void fetchNotifications();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchNotifications]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    // Refresh on open
    void fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await notificationService.markAllRead();
      await fetchNotifications();
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkRead = async (id?: string) => {
    if (!id) return;
    try {
      await notificationService.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton color="inherit" aria-label="Thông báo" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 380, mt: 1.5 } }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Thông báo
          </Typography>
          <Button
            size="small"
            startIcon={
              markingAllRead ? (
                <CircularProgress size={14} />
              ) : (
                <DoneAllIcon fontSize="small" />
              )
            }
            onClick={handleMarkAllRead}
            disabled={markingAllRead || unreadCount === 0}
          >
            Đọc tất cả
          </Button>
        </Box>

        {/* Body */}
        {loading && notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Không có thông báo mới.
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.map((notif) => (
              <ListItemButton
                key={notif.id}
                onClick={() => handleMarkRead(notif.id)}
                sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: notif.isRead ? "transparent" : "action.hover",
                  borderBottom: 1,
                  borderColor: "divider",
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight={notif.isRead ? 400 : 600}
                      noWrap
                    >
                      {notif.title || "Thông báo"}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {notif.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ display: "block", mt: 0.25 }}
                      >
                        {formatDateTimeCompactVN(notif.createdAt)}
                      </Typography>
                    </>
                  }
                />
                {!notif.isRead && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      flexShrink: 0,
                      ml: 1,
                    }}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
};
