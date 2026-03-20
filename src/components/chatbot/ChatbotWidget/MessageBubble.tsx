import { Box, Avatar, Typography } from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AiLogo from "@/assets/AI_LOGO.png";
import { parseAssistantPayload } from "./helpers";
import { ProductCard } from "./ProductCard";
import type { ChatMessage } from "@/types/chatbot";

interface MessageBubbleProps {
  msg: ChatMessage;
  onAddToCart: (variantId: string, productName: string) => void;
  onNavigate: (productId: string) => void;
}

export function MessageBubble({
  msg,
  onAddToCart,
  onNavigate,
}: MessageBubbleProps) {
  const isUser = msg.sender === "user";

  if (isUser) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          alignItems: "flex-end",
        }}
      >
        <Box
          sx={{
            maxWidth: "75%",
            background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
            color: "#fff",
            borderRadius: "18px 18px 4px 18px",
            px: 2,
            py: 1,
            boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
            {msg.message}
          </Typography>
        </Box>
        <Avatar
          sx={{ width: 28, height: 28, bgcolor: "#dc2626", flexShrink: 0 }}
        >
          <PersonIcon sx={{ fontSize: 16 }} />
        </Avatar>
      </Box>
    );
  }

  // Assistant
  const payload = parseAssistantPayload(msg.message);
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
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            background: "#f8f9fa",
            border: "1px solid #e9ecef",
            borderRadius: "18px 18px 18px 4px",
            px: 2,
            py: 1,
            mb: payload.products.length > 0 ? 1 : 0,
            "& > p": { lineHeight: 1.6, mb: 1, margin: 0 },
            "& > p:last-child": { mb: 0 },
            "& ul, & ol": { pl: 2, mb: 1 },
            "& li": { mb: 0.5 },
            "& code": {
              bgcolor: "#e9ecef",
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: "monospace",
            },
            "& pre": {
              bgcolor: "#2d3748",
              color: "#e2e8f0",
              p: 1.5,
              borderRadius: 1,
              overflowX: "auto",
              mb: 1,
            },
            "& pre code": {
              bgcolor: "transparent",
              p: 0,
              m: 0,
            },
            "& strong": { fontWeight: 700 },
            "& em": { fontStyle: "italic" },
            "& a": {
              color: "#dc2626",
              textDecoration: "underline",
              cursor: "pointer",
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {payload.message}
          </ReactMarkdown>
        </Box>

        {/* Product cards */}
        {payload.products.length > 0 && (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              overflowX: "auto",
              pb: 0.5,
              "&::-webkit-scrollbar": { height: 4 },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "#ddd",
                borderRadius: 2,
              },
            }}
          >
            {payload.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onNavigate={onNavigate}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
