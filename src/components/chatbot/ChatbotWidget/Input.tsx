import { Box, TextField, IconButton, Tooltip, CircularProgress } from "@mui/material";
import {
  GraphicEq as VoiceIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
  Stop as StopIcon,
} from "@mui/icons-material";

interface ChatInputProps {
  conversationActive: boolean;
  input: string;
  transcript: string;
  loading: boolean;
  listening: boolean;
  browserSupportsSpeechRecognition: boolean;
  onVoiceInput: () => void;
  onConversationToggle: () => void;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
}

export function ChatInput({
  conversationActive,
  input,
  transcript,
  loading,
  listening,
  browserSupportsSpeechRecognition,
  onVoiceInput,
  onConversationToggle,
  onInputChange,
  onKeyDown,
  onSend,
}: ChatInputProps) {
  const isInputEmpty = !input.trim();

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
      {!conversationActive && (
        <Tooltip title={listening ? "Dừng ghi âm" : "Ghi âm một lần"}>
          <IconButton
            onClick={onVoiceInput}
            disabled={loading || !browserSupportsSpeechRecognition}
            size="small"
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              color: listening ? "#dc2626" : "text.secondary",
              bgcolor: listening ? "#fef2f2" : "transparent",
              border: listening ? "1.5px solid #dc2626" : "none",
              "&:hover": { bgcolor: "#fef2f2" },
            }}
          >
            {listening ? (
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
        placeholder="Nhập tin nhắn…"
        size="small"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={loading}
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 3,
            bgcolor: "#f8f9fa",
            "& fieldset": {
              borderColor: "#e9ecef",
            },
            "&:hover fieldset": {
              borderColor: "#dc2626",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#dc2626",
            },
          },
        }}
      />

      <Tooltip
        title={
          conversationActive
            ? "Dừng hội thoại"
            : isInputEmpty
              ? "Bắt đầu hội thoại"
              : "Gửi (Enter)"
        }
      >
        <span>
          <IconButton
            onClick={conversationActive ? onConversationToggle : (isInputEmpty ? onConversationToggle : onSend)}
            disabled={loading && !conversationActive}
            sx={{
              bgcolor: "#dc2626",
              color: "#fff",
              borderRadius: 2.5,
              width: 40,
              height: 40,
              flexShrink: 0,
              "&:hover": { bgcolor: "#ef4444" },
              "&.Mui-disabled": { bgcolor: "#ddd", color: "#aaa" },
              boxShadow: conversationActive ? "0 0 10px rgba(220,38,38,0.5)" : "none",
            }}
          >
            {loading && !conversationActive ? (
              <CircularProgress size={18} sx={{ color: "#ccc" }} />
            ) : conversationActive ? (
              <StopIcon fontSize="small" />
            ) : isInputEmpty ? (
              <VoiceIcon fontSize="small" />
            ) : (
              <SendIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
