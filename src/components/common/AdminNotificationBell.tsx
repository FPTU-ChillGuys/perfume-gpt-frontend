import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Pagination,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  NotificationsNone as NotificationsNoneIcon,
  DoneAll as DoneAllIcon,
  ShoppingBag as OrderIcon,
  Cancel as CancelIcon,
  AssignmentReturn as ReturnIcon,
  Inventory as ImportIcon,
  Tune as AdjustIcon,
  Notifications as AllIcon,
} from "@mui/icons-material";
import {
  notificationService,
  type NotificationItem,
  type NotifiReferenceType,
} from "@/services/notificationService";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTimeCompactVN } from "@/utils/dateTime";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000;
const PAGE_SIZE = 8;

type FilterValue = NotifiReferenceType | "all";

interface FilterTab {
  value: FilterValue;
  label: string;
  icon: React.ReactNode;
}

const FILTER_TABS: FilterTab[] = [
  { value: "all", label: "Tất cả", icon: <AllIcon sx={{ fontSize: 14 }} /> },
  { value: "Order", label: "Đơn hàng", icon: <OrderIcon sx={{ fontSize: 14 }} /> },
  { value: "OrderCancelRequest", label: "Huỷ đơn", icon: <CancelIcon sx={{ fontSize: 14 }} /> },
  { value: "OrderReturnRequest", label: "Hoàn trả", icon: <ReturnIcon sx={{ fontSize: 14 }} /> },
  { value: "ImportTicket", label: "Nhập kho", icon: <ImportIcon sx={{ fontSize: 14 }} /> },
  { value: "Adjustment", label: "Điều chỉnh", icon: <AdjustIcon sx={{ fontSize: 14 }} /> },
];

// ---------------------------------------------------------------------------
// Helper: icon + colour per referenceType
// ---------------------------------------------------------------------------

const typeConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  Order: {
    icon: <OrderIcon sx={{ fontSize: 16 }} />,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
  },
  OrderCancelRequest: {
    icon: <CancelIcon sx={{ fontSize: 16 }} />,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
  },
  OrderReturnRequest: {
    icon: <ReturnIcon sx={{ fontSize: 16 }} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  },
  ImportTicket: {
    icon: <ImportIcon sx={{ fontSize: 16 }} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
  },
  Adjustment: {
    icon: <AdjustIcon sx={{ fontSize: 16 }} />,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
  },
  default: {
    icon: <AllIcon sx={{ fontSize: 16 }} />,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
  },
};

const getTypeConfig = (
  ref?: string | null,
): { icon: React.ReactNode; color: string; bg: string } =>
  (ref ? (typeConfig[ref] ?? typeConfig.default) : typeConfig.default) as {
    icon: React.ReactNode;
    color: string;
    bg: string;
  };

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const relativeTime = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
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
// Component
// ---------------------------------------------------------------------------

export const AdminNotificationBell = () => {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetRole = user?.role === "admin" ? "admin" : "staff";

  // ----- Fetch -----
  const fetchNotifications = useCallback(
    async (currentPage = page, filter = activeFilter) => {
      setLoading(true);
      try {
        const [allResult, unreadResult] = await Promise.all([
          notificationService.getNotifications({
            targetRole,
            referenceType: filter === "all" ? undefined : filter,
            pageNumber: currentPage,
            pageSize: PAGE_SIZE,
          }),
          notificationService.getNotifications({
            targetRole,
            isRead: false,
            pageSize: 1,
          }),
        ]);
        setNotifications(allResult.items);
        setTotalPages(allResult.totalPages ?? 1);
        setUnreadCount(unreadResult.totalCount);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targetRole, page, activeFilter],
  );

  // Initial fetch + polling
  useEffect(() => {
    void fetchNotifications(page, activeFilter);
    pollTimerRef.current = setInterval(() => {
      void fetchNotifications(page, activeFilter);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchNotifications]);

  // ----- Handlers -----
  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    void fetchNotifications(page, activeFilter);
  };

  const handleClose = () => setAnchorEl(null);

  const handleFilterChange = (filter: FilterValue) => {
    setActiveFilter(filter);
    setPage(1);
    void fetchNotifications(1, filter);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    void fetchNotifications(value, activeFilter);
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await notificationService.markAllRead();
      await fetchNotifications(page, activeFilter);
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
      <IconButton
        color="inherit"
        aria-label="Thông báo"
        onClick={handleOpen}
        sx={{
          transition: "all 0.2s ease",
          "&:hover": { color: "primary.main" },
        }}
      >
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
        disableScrollLock
        PaperProps={{
          elevation: 8,
          sx: {
            width: 420,
            mt: 1.5,
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle1" fontWeight={700} letterSpacing={0.2}>
              Thông báo
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                color="error"
                sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
              />
            )}
          </Stack>
          <Tooltip title="Đánh dấu tất cả đã đọc">
            <span>
              <IconButton
                size="small"
                onClick={handleMarkAllRead}
                disabled={markingAllRead || unreadCount === 0}
                sx={{
                  color: "primary.main",
                  opacity: unreadCount === 0 ? 0.4 : 1,
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                {markingAllRead ? (
                  <CircularProgress size={16} />
                ) : (
                  <DoneAllIcon fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* ── Filter chips ── */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            display: "flex",
            gap: 0.75,
            flexWrap: "wrap",
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {FILTER_TABS.map((tab) => (
            <Chip
              key={String(tab.value)}
              icon={tab.icon as React.ReactElement}
              label={tab.label}
              size="small"
              clickable
              onClick={() => handleFilterChange(tab.value)}
              variant={activeFilter === tab.value ? "filled" : "outlined"}
              color={activeFilter === tab.value ? "primary" : "default"}
              sx={{
                fontSize: "0.7rem",
                fontWeight: activeFilter === tab.value ? 700 : 400,
                height: 24,
                transition: "all 0.2s",
                "& .MuiChip-icon": { ml: 0.5 },
              }}
            />
          ))}
        </Box>

        {/* ── Body ── */}
        <Box sx={{ minHeight: 120, position: "relative" }}>
          {loading ? (
            <Box
              sx={{
                py: 6,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <CircularProgress size={28} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              sx={{
                py: 6,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <NotificationsNoneIcon
                sx={{ fontSize: 40, color: "text.disabled" }}
              />
              <Typography variant="body2" color="text.secondary">
                Không có thông báo nào.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 380, overflowY: "auto" }}>
              {notifications.map((notif, idx) => {
                const cfg = getTypeConfig(notif.referenceType);
                return (
                  <Box key={notif.id}>
                    <Box
                      onClick={() => handleMarkRead(notif.id)}
                      sx={{
                        display: "flex",
                        gap: 1.5,
                        px: 2,
                        py: 1.5,
                        cursor: "pointer",
                        position: "relative",
                        bgcolor: notif.isRead
                          ? "transparent"
                          : (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(99,102,241,0.06)"
                                : "rgba(99,102,241,0.04)",
                        transition: "background 0.18s",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      {/* Type icon */}
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          minWidth: 36,
                          borderRadius: "50%",
                          bgcolor: cfg.bg,
                          color: cfg.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          mt: 0.25,
                        }}
                      >
                        {cfg.icon}
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={notif.isRead ? 400 : 700}
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.4,
                            mb: 0.25,
                          }}
                        >
                          {notif.title || "Thông báo"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.5,
                          }}
                        >
                          {notif.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            mt: 0.5,
                            color: "text.disabled",
                            fontSize: "0.68rem",
                          }}
                        >
                          {formatDateTimeCompactVN(notif.createdAt)}
                          {" · "}
                          {relativeTime(notif.createdAt)}
                        </Typography>
                      </Box>

                      {/* Unread dot */}
                      {!notif.isRead && (
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            minWidth: 7,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                            mt: 0.75,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                    {idx < notifications.length - 1 && (
                      <Divider sx={{ mx: 2, opacity: 0.5 }} />
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <Box
            sx={{
              px: 2,
              py: 1.25,
              display: "flex",
              justifyContent: "center",
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              size="small"
              color="primary"
              siblingCount={0}
              boundaryCount={1}
              sx={{
                "& .MuiPaginationItem-root": {
                  fontSize: "0.72rem",
                  minWidth: 28,
                  height: 28,
                },
              }}
            />
          </Box>
        )}
      </Popover>
    </>
  );
};
