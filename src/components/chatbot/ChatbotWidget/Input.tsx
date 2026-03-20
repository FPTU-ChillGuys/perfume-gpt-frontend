import { Box, TextField, IconButton, Tooltip, CircularProgress } from "@mui/material";
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
} from "@mui/icons-material";

interface ChatInputProps {
  dialogMode: boolean;
  testMicMode: boolean;
  conversationActive: boolean;
  input: string;
  transcript: string;
  loading: boolean;
  browserSupportsSpeechRecognition: boolean;
  onVoiceInput: () => void;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
}

export function ChatInput({
  dialogMode,
  testMicMode,
  conversationActive,
  input,
  transcript,
  loading,
  browserSupportsSpeechRecognition,
  onVoiceInput,
  onInputChange,
  onKeyDown,
  onSend,
}: ChatInputProps) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        gap: 1,
        alignItems: "flex-end",
        bgcolor: "#fff",
        flexShrink: 0,
      }}
    >
      {dialogMode && (
        <Tooltip
          title={
            testMicMode
              ? "Dừng test mic"
              : conversationActive
                ? "Kết thúc chế độ hội thoại"
                : "Bắt đầu chế độ hội thoại"
          }
        >
          <IconButton
            onClick={onVoiceInput}
            disabled={loading || !browserSupportsSpeechRecognition}
            size="small"
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              color:
                conversationActive || testMicMode ? "#dc2626" : "text.secondary",
              bgcolor:
                conversationActive || testMicMode ? "#fef2f2" : "transparent",
              border:
                conversationActive || testMicMode
                  ? "1.5px solid #dc2626"
                  : "none",
              animation: testMicMode ? "pulse 1s infinite" : "none",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.6 },
              },
              "&:hover": { bgcolor: "#fef2f2" },
            }}
          >
            {conversationActive || testMicMode ? (
              <MicIcon sx={{ fontSize: 18 }} />
            ) : (
              <MicOffIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      )}

      <TextField
        fullWidth
        multiline
        maxRows={4}
        placeholder={
          testMicMode ? "Test mode - nói gì đó..." : "Nhập tin nhắn…"
        }
        size="small"
        value={testMicMode ? transcript : input}
        onChange={(e) => {
          if (!testMicMode) {
            onInputChange(e.target.value);
          }
        }}
        onKeyDown={onKeyDown}
        disabled={loading || testMicMode}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 3,
            bgcolor: testMicMode ? "#f0f9ff" : "#f8f9fa",
            "& fieldset": {
              borderColor: testMicMode ? "#3b82f6" : "#e9ecef",
            },
            "&:hover fieldset": {
              borderColor: testMicMode ? "#3b82f6" : "#dc2626",
            },
            "&.Mui-focused fieldset": {
              borderColor: testMicMode ? "#3b82f6" : "#dc2626",
            },
          },
        }}
      />

      {!testMicMode && (
        <Tooltip title="Gửi (Enter)">
          <span>
            <IconButton
              onClick={onSend}
              disabled={loading || !input.trim()}
              sx={{
                bgcolor: "#dc2626",
                color: "#fff",
                borderRadius: 2.5,
                width: 40,
                height: 40,
                flexShrink: 0,
                "&:hover": { bgcolor: "#ef4444" },
                "&.Mui-disabled": { bgcolor: "#ddd", color: "#aaa" },
              }}
            >
              {loading ? (
                <CircularProgress size={18} sx={{ color: "#ccc" }} />
              ) : (
                <SendIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
