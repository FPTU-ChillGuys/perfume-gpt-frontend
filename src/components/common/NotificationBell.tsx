import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from "@mui/material";
import {
  NotificationsNone as NotificationsNoneIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";
import type { NotificationItem } from "@/services/notificationService";
import { parseServerDate } from "@/utils/dateTime";

// ---------------------------------------------------------------------------
// Relative time formatter (Vietnamese) — avoids date-fns dependency
// ---------------------------------------------------------------------------

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const formatRelativeTime = (value?: string | null): string => {
  const date = parseServerDate(value);
  if (!date) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 0) return "Vừa xong";
  if (diff < MINUTE) return "Vừa xong";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`;
  if (diff < DAY * 30) return `${Math.floor(diff / DAY)} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NotificationBellProps {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  /** Called when user clicks a notification item — parent handles navigation */
  onItemClick?: (item: NotificationItem) => void;
  markingAllRead?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NotificationBell = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onItemClick,
  markingAllRead = false,
}: NotificationBellProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead && item.id) {
      onMarkAsRead(item.id);
    }
    onItemClick?.(item);
    handleClose();
  };

  return (
    <>
      <IconButton
        color="default"
        aria-label="Thông báo"
        onClick={handleOpen}
        sx={{
          transition: "all 0.2s ease",
          "&:hover": {
            color: "primary.main",
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsNoneIcon fontSize="medium" />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 380, mt: 1.5, maxHeight: 520 } }}
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
            onClick={onMarkAllAsRead}
            disabled={markingAllRead || unreadCount === 0}
          >
            Đọc tất cả
          </Button>
        </Box>

        {/* Body */}
        {notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Không có thông báo mới.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 440, overflowY: "auto" }}>
            {notifications.map((notif) => (
              <ListItemButton
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                sx={{
                  px: 2,
                  py: 1.25,
                  alignItems: "flex-start",
                  bgcolor: notif.isRead ? "transparent" : "action.hover",
                  borderBottom: 1,
                  borderColor: "divider",
                  "&:last-child": { borderBottom: 0 },
                }}
              >
                {/* Unread indicator dot */}
                {!notif.isRead && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      minWidth: 8,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      mt: 0.75,
                      mr: 1.5,
                      flexShrink: 0,
                    }}
                  />
                )}

                <ListItemText
                  sx={{ my: 0 }}
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight={notif.isRead ? 400 : 600}
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {notif.title || "Thông báo"}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
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
                        component="span"
                        variant="caption"
                        color="text.disabled"
                        sx={{ display: "block", mt: 0.25 }}
                      >
                        {formatRelativeTime(notif.createdAt)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </Box>
        )}
      </Popover>
    </>
  );
};
