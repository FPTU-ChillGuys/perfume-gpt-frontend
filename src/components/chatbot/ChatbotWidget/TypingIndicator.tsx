import { Box, Avatar } from "@mui/material";
import AiLogo from "@/assets/AI_LOGO.png";

export function TypingIndicator() {
  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
      <Avatar
        src={AiLogo}
        sx={{
          width: 28,
          height: 28,
          flexShrink: 0,
          mt: 0.3,
          bgcolor: "transparent",
        }}
      />
      <Box
        sx={{
          background: "#f8f9fa",
          border: "1px solid #e9ecef",
          borderRadius: "18px 18px 18px 4px",
          px: 2,
          py: 1.2,
          display: "flex",
          gap: 0.6,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: "#adb5bd",
              animation: "bounce 1.4s infinite ease-in-out",
              animationDelay: `${i * 0.2}s`,
              "@keyframes bounce": {
                "0%, 60%, 100%": { transform: "translateY(0)" },
                "30%": { transform: "translateY(-6px)" },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
