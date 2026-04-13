import { Box, Avatar, Typography, IconButton } from "@mui/material";
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import AiLogo from "@/assets/AI_LOGO.png";

interface ChatHeaderProps {
  onSettingsClick: (event: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}

export function ChatHeader({
  onSettingsClick,
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

      <IconButton
        size="small"
        onClick={onSettingsClick}
        sx={{
          color: "rgba(255,255,255,0.8)",
          "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
          mr: 0.5,
        }}
      >
        <SettingsIcon fontSize="small" />
      </IconButton>

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
