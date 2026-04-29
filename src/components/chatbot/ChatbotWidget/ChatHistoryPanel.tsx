import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { conversationService } from "@/services/ai/conversationService";
import { authService } from "@/services/authService";
import { getOrCreateGuestUserId } from "@/utils/guestUserId";
import type { ConversationHistoryItem } from "@/types/conversation";

interface ChatHistoryPanelProps {
  onSelectConversation: (conversation: ConversationHistoryItem) => void;
  onNewChat: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / 86400000
  );

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return "7 ngày trước";
  return "Cũ hơn";
}

function groupByDate(
  items: ConversationHistoryItem[]
): Map<string, ConversationHistoryItem[]> {
  const groups = new Map<string, ConversationHistoryItem[]>();
  for (const item of items) {
    const key = getDateGroup(item.updatedAt);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }
  return groups;
}

function getPreviewText(item: ConversationHistoryItem): string {
  const firstUserMsg = item.messages?.find((m) => m.sender === "user");
  if (firstUserMsg?.message) {
    const text =
      typeof firstUserMsg.message === "string"
        ? firstUserMsg.message
        : JSON.stringify(firstUserMsg.message);
    return text.length > 60 ? text.slice(0, 60) + "…" : text;
  }
  return "(Không có tin nhắn)";
}

export function ChatHistoryPanel({
  onSelectConversation,
  onNewChat,
}: ChatHistoryPanelProps) {
  const [items, setItems] = useState<ConversationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = authService.getCurrentUser();
      const userId = currentUser?.id ?? getOrCreateGuestUserId();
      const response = await conversationService.getMyHistory(userId);
      setItems(response.data?.items ?? []);
    } catch (err: any) {
      setError(err.message || "Không thể tải lịch sử");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 4,
        }}
      >
        <CircularProgress size={24} sx={{ color: "#dc2626" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Chưa có lịch sử chat
        </Typography>
      </Box>
    );
  }

  const groups = groupByDate(items);

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: "#ddd",
          borderRadius: 2,
        },
      }}
    >
      <Box sx={{ px: 1, pt: 1, pb: 0.5 }}>
        <IconButton
          onClick={onNewChat}
          size="small"
          sx={{
            bgcolor: "#dc2626",
            color: "#fff",
            borderRadius: 1.5,
            width: "100%",
            py: 0.5,
            "&:hover": { bgcolor: "#ef4444" },
          }}
        >
          <AddIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Chat mới
          </Typography>
        </IconButton>
      </Box>

      {Array.from(groups.entries()).map(([groupLabel, groupItems]) => (
        <Box key={groupLabel}>
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 0.75,
              display: "block",
              color: "text.secondary",
              fontWeight: 600,
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {groupLabel}
          </Typography>
          <List disablePadding>
            {groupItems.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => onSelectConversation(item)}
                sx={{
                  px: 2,
                  py: 1,
                  "&:hover": { bgcolor: "#fef2f2" },
                }}
              >
                <ListItemText
                  primary={getPreviewText(item)}
                  secondary={formatRelativeTime(item.updatedAt)}
                  primaryTypographyProps={{
                    variant: "body2",
                    noWrap: true,
                    sx: { fontWeight: 500 },
                  }}
                  secondaryTypographyProps={{
                    variant: "caption",
                    color: "text.secondary",
                  }}
                />
              </ListItemButton>
            ))}
          </List>
          <Divider />
        </Box>
      ))}
    </Box>
  );
}