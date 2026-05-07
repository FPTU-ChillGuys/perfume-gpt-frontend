import { Box, Avatar, Typography, Divider, Chip } from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import AiLogo from "@/assets/AI_LOGO.png";
import { parseAssistantPayload } from "./helpers";
import { ProductCard } from "./ProductCard";
import type { ChatMessage } from "@/types/chatbot";

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => (
    <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
      {children}
    </Typography>
  ),
  strong: ({ children }) => (
    <Typography
      component="span"
      sx={{ fontWeight: 700, color: "#dc2626" }}
    >
      {children}
    </Typography>
  ),
  em: ({ children }) => (
    <Typography
      component="span"
      sx={{ fontStyle: "italic", color: "#6b7280" }}
    >
      {children}
    </Typography>
  ),
  hr: () => <Divider sx={{ my: 2, borderColor: "#fecaca" }} />,
  code: ({ children }) => (
    <Chip
      label={children}
      size="small"
      sx={{
        bgcolor: "#fce7f3",
        color: "#be185d",
        fontSize: "0.8rem",
        fontFamily: "monospace",
        height: "auto",
        "& .MuiChip-label": { px: 1, py: 0.25 },
      }}
    />
  ),
};

interface MessageBubbleProps {
  msg: ChatMessage;
  onAddToCart: (variantId: string, productName: string, aiAcceptanceId?: string) => void;
  onNavigate: (productId: string, variantId?: string, aiAcceptanceId?: string) => void;
  onSuggestionClick?: (question: string) => void;
  isLastMessage?: boolean;
}

export function MessageBubble({
  msg,
  onAddToCart,
  onNavigate,
  onSuggestionClick,
  isLastMessage = false,
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
            background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 50%, #f8f9fa 100%)",
            border: "1px solid #e9ecef",
            borderLeft: "3px solid #fda4af",
            borderRadius: "18px 18px 18px 4px",
            px: 2,
            py: 1.5,
            mb: payload.products?.length > 0 ? 1 : 0,
            boxShadow: "0 1px 4px rgba(251,113,133,0.1)",
            "& > p": { lineHeight: 1.8, mb: 1.5, margin: 0, wordBreak: "break-word" },
            "& > p:last-child": { mb: 0 },
            "& ul, & ol": { pl: 2, mb: 1 },
            "& li": { mb: 1.5 },
            "& h1, & h2, & h3": { fontWeight: 700, mt: 2, mb: 1 },
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
            "& a": {
              color: "#dc2626",
              textDecoration: "underline",
              cursor: "pointer",
            },
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={MARKDOWN_COMPONENTS}
          >
            {payload.message}
          </ReactMarkdown>
        </Box>

        {/* Product cards */}
        {payload.products?.length > 0 && (
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

        {/* Suggested questions - only show in last message */}
        {isLastMessage && payload.suggestedQuestions && payload.suggestedQuestions.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              mt: 1.5,
            }}
          >
            {payload.suggestedQuestions.map((question, idx) => (
              <Box
                key={idx}
                onClick={() => onSuggestionClick?.(question)}
                sx={{
                  bgcolor: "#fff",
                  border: "1px solid #dc2626",
                  color: "#dc2626",
                  borderRadius: "16px",
                  px: 1.5,
                  py: 0.5,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "#fef2f2",
                    transform: "translateY(-1px)",
                    boxShadow: "0 2px 4px rgba(220,38,38,0.1)",
                  },
                }}
              >
                {question}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
