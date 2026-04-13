import { Box, Avatar, Typography, Tooltip, Switch, IconButton } from "@mui/material";
import { VolumeUp as VolumeUpIcon, Close as CloseIcon } from "@mui/icons-material";
import AiLogo from "@/assets/AI_LOGO.png";

interface ChatHeaderProps {
  dialogMode: boolean;
  testMicMode: boolean;
  onDialogModeChange: (enabled: boolean) => void;
  onTestMicClick: () => void;
  onClose: () => void;
}

export function ChatHeader({
  dialogMode,
  testMicMode,
  onDialogModeChange,
  onTestMicClick,
  onClose,
}: ChatHeaderProps) {
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #1f2937 0%, #dc2626 100%)",
        color: "#fff",
        px: 2.5,
        py: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      <Avatar
        src={AiLogo}
        sx={{ width: 36, height: 36, bgcolor: "transparent" }}
      />
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 700, lineHeight: 1.2 }}
        >
          PerfumeGPT Assistant
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: "#2ecc71",
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.4 },
              },
            }}
          />
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            Đang hoạt động
          </Typography>
        </Box>
      </Box>

      {/* Dialog Mode Toggle */}
      <Tooltip
        title={
          testMicMode
            ? "Đang test mic..."
            : dialogMode
              ? "Tắt chế độ hội thoại"
              : "Bật chế độ hội thoại"
        }
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <VolumeUpIcon
            sx={{
              fontSize: 18,
              opacity: dialogMode ? 1 : 0.6,
              transition: "opacity 0.2s",
            }}
          />
          <Switch
            size="small"
            checked={dialogMode}
            onChange={(e) => {
              onDialogModeChange(e.target.checked);
            }}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: "#2ecc71",
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: "#2ecc71",
              },
            }}
          />
        </Box>
      </Tooltip>

      {/* Test Mic Button */}
      {dialogMode && (
        <Tooltip title={testMicMode ? "Dừng test mic" : "Test microphone"}>
          <IconButton
            size="small"
            onClick={onTestMicClick}
            sx={{
              color: testMicMode ? "#dc2626" : "text.secondary",
              bgcolor: testMicMode ? "#fef2f2" : "transparent",
              border: testMicMode ? "1.5px solid #dc2626" : "none",
              animation: testMicMode ? "pulse 1s infinite" : "none",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.6 },
              },
              "&:hover": { bgcolor: "#fef2f2" },
            }}
          >
            🎤
          </IconButton>
        </Tooltip>
      )}

      <IconButton
        size="small"
        onClick={onClose}
        sx={{
          color: "rgba(255,255,255,0.8)",
          "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
