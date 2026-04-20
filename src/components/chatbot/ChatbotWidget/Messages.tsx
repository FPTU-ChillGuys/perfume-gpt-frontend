import { Box, Avatar, Typography, Chip } from "@mui/material";
import AiLogo from "@/assets/AI_LOGO.png";
import type { ChatMessage } from "@/types/chatbot";

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
  onMessageClick: (suggestion: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  renderMessage: (msg: ChatMessage, idx: number, isLastMessage: boolean) => React.ReactNode;
  renderTypingIndicator: () => React.ReactNode;
  isStaffMode?: boolean;
}

export function ChatMessages({
  messages,
  loading,
  onMessageClick,
  messagesEndRef,
  renderMessage,
  renderTypingIndicator,
  isStaffMode = false,
}: ChatMessagesProps) {
  return (
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        px: 2,
        py: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        bgcolor: "#fff",
        "&::-webkit-scrollbar": { width: 5 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: "#dee2e6",
          borderRadius: 3,
        },
      }}
    >
      {messages.length === 0 && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            py: 4,
            color: "text.secondary",
          }}
        >
          <Avatar
            src={AiLogo}
            sx={{ width: 64, height: 64, bgcolor: "transparent" }}
          />
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              {isStaffMode ? "Công cụ Tư vấn (Staff Mode) 🛠️" : "Xin chào! Tôi là PerfumeGPT 👋"}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 280 }}>
              {isStaffMode 
                ? "Tra cứu tồn kho, so sánh sản phẩm hoặc tóm tắt đánh giá để hỗ trợ khách hàng nhanh nhất."
                : "Hãy hỏi tôi về nước hoa – tôi sẽ gợi ý những sản phẩm phù hợp nhất cho bạn!"}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {(isStaffMode 
              ? ["Check kho Bleu de Chanel", "So sánh Dior Sauvage vs YSL Y", "Tóm tắt review chai Lancome", "Tìm mùi hương theo gu khách"]
              : ["Gợi ý nước hoa nam", "Nước hoa nữ dịu nhẹ", "Nước hoa tặng quà"]
            ).map((s) => (
              <Chip
                key={s}
                label={s}
                onClick={() => onMessageClick(s)}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: isStaffMode ? "slateblue" : "#dc2626",
                  color: isStaffMode ? "slateblue" : "#dc2626",
                  cursor: "pointer",
                  "&:hover": { bgcolor: isStaffMode ? "ghostwhite" : "#fef2f2" },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {messages.map((msg, idx) => renderMessage(msg, idx, idx === messages.length - 1))}

      {loading && renderTypingIndicator()}
      <div ref={messagesEndRef} />
    </Box>
  );
}
