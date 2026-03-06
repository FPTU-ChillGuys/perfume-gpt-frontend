import { useState, useRef, useEffect, useCallback } from "react";
import {
    Box,
    IconButton,
    Paper,
    Typography,
    TextField,
    CircularProgress,
    Tooltip,
    Divider,
    Chip,
    Avatar,
} from "@mui/material";
import {
    Chat as ChatIcon,
    Close as CloseIcon,
    Send as SendIcon,
    SmartToy as BotIcon,
    Person as PersonIcon,
    ShoppingCart as CartIcon,
    Storefront as StoreIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

import { chatbotService } from "@/services/ai/chatbotService";
import { aiAcceptanceService } from "@/services/ai/aiAcceptanceService";
import { cartService } from "@/services/cartService";
import { useToast } from "@/hooks/useToast";
import { authService } from "@/services/authService";
import type { ChatMessage, AssistantPayload, ChatProduct, ChatVariant } from "@/types/chatbot";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseAssistantPayload(raw: string): AssistantPayload {
    try {
        return JSON.parse(raw) as AssistantPayload;
    } catch {
        return { message: raw, products: [] };
    }
}

function formatPrice(price: number) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
    }).format(price);
}

// ─── Product Card ────────────────────────────────────────────────────────────

function ProductCard({
    product,
    acceptanceId,
    onAddToCart,
    onNavigate,
}: {
    product: ChatProduct;
    acceptanceId?: string;
    onAddToCart: (variantId: string, productName: string) => void;
    onNavigate: (productId: string, acceptanceId?: string) => void;
}) {
    const [selectedVariant, setSelectedVariant] = useState<ChatVariant | null>(
        (product.variants && product.variants.length > 0 ? product.variants[0] : null) ?? null
    );
    const [adding, setAdding] = useState(false);
    const hasAcceptedRef = useRef(false);

    const handleAdd = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedVariant) return;
        setAdding(true);
        try {
            // Trigger AI Acceptance update if we have an ID and haven't already accepted
            if (acceptanceId && !hasAcceptedRef.current) {
                try {
                    await aiAcceptanceService.updateAcceptanceRecord(acceptanceId);
                    hasAcceptedRef.current = true;
                } catch (e) {
                    console.error("Failed to update AI acceptance:", e);
                }
            }
            await onAddToCart(selectedVariant.id, product.name);
        } finally {
            setAdding(false);
        }
    };

    const handleCardClick = async () => {
        // AI acceptance can also be triggered by navigating to the product detail page
        if (acceptanceId && !hasAcceptedRef.current) {
            try {
                await aiAcceptanceService.updateAcceptanceRecord(acceptanceId);
                hasAcceptedRef.current = true;
            } catch (e) {
                console.error("Failed to update AI acceptance on navigation:", e);
            }
        }
        onNavigate(product.id, acceptanceId);
    };

    return (
        <Paper
            elevation={2}
            onClick={handleCardClick}
            sx={{
                minWidth: 200,
                maxWidth: 220,
                borderRadius: 2,
                overflow: "hidden",
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                border: "1px solid",
                borderColor: "divider",
                cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s",
                "&:hover": {
                    boxShadow: 6,
                    transform: "translateY(-2px)",
                },
            }}
        >
            {/* Image */}
            <Box
                sx={{
                    height: 110,
                    background: product.primaryImage
                        ? `url(${product.primaryImage}) center/cover no-repeat`
                        : "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {!product.primaryImage && (
                    <StoreIcon sx={{ fontSize: 36, color: "rgba(255,255,255,0.7)" }} />
                )}
            </Box>

            {/* Content */}
            <Box sx={{ p: 1.2, flexGrow: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {product.brandName}
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                    {product.name}
                </Typography>
                <Chip
                    label={product.categoryName}
                    size="small"
                    sx={{ alignSelf: "flex-start", height: 18, fontSize: "0.65rem", bgcolor: "#fef3f2", color: "#c0392b" }}
                />

                {/* Variant selector */}
                {product.variants && product.variants.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.4 }}>
                            Chọn loại:
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
                            {product.variants.map((v) => (
                                <Chip
                                    key={v.id}
                                    label={`${v.volumeMl}ml`}
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedVariant(v);
                                    }}
                                    variant={selectedVariant?.id === v.id ? "filled" : "outlined"}
                                    sx={{
                                        height: 20,
                                        fontSize: "0.65rem",
                                        cursor: "pointer",
                                        bgcolor: selectedVariant?.id === v.id ? "#c0392b" : undefined,
                                        color: selectedVariant?.id === v.id ? "#fff" : undefined,
                                        borderColor: "#c0392b",
                                        "&:hover": { bgcolor: "#e74c3c", color: "#fff" },
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Price */}
                {selectedVariant && (
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#c0392b", mt: 0.3 }}>
                        {formatPrice(selectedVariant.basePrice)}
                    </Typography>
                )}
            </Box>

            {/* Add to cart button */}
            <Box sx={{ px: 1.2, pb: 1.2 }}>
                <Box
                    component="button"
                    onClick={handleAdd}
                    disabled={adding || !selectedVariant}
                    sx={{
                        width: "100%",
                        py: 0.7,
                        border: "none",
                        borderRadius: 1.5,
                        background: adding || !selectedVariant
                            ? "#ccc"
                            : "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        cursor: adding || !selectedVariant ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5,
                        transition: "opacity 0.2s",
                        "&:hover": { opacity: adding || !selectedVariant ? 1 : 0.9 },
                    }}
                >
                    {adding ? (
                        <CircularProgress size={12} sx={{ color: "#fff" }} />
                    ) : (
                        <CartIcon sx={{ fontSize: 14 }} />
                    )}
                    Thêm vào giỏ
                </Box>
            </Box>
        </Paper>
    );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({
    msg,
    onAddToCart,
    onNavigate,
}: {
    msg: ChatMessage;
    onAddToCart: (variantId: string, productName: string) => void;
    onNavigate: (productId: string, acceptanceId?: string) => void;
}) {
    const isUser = msg.sender === "user";

    if (isUser) {
        return (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, alignItems: "flex-end" }}>
                <Box
                    sx={{
                        maxWidth: "75%",
                        background: "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
                        color: "#fff",
                        borderRadius: "18px 18px 4px 18px",
                        px: 2,
                        py: 1,
                        boxShadow: "0 2px 8px rgba(192,57,43,0.3)",
                    }}
                >
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                        {msg.message}
                    </Typography>
                </Box>
                <Avatar sx={{ width: 28, height: 28, bgcolor: "#c0392b", flexShrink: 0 }}>
                    <PersonIcon sx={{ fontSize: 16 }} />
                </Avatar>
            </Box>
        );
    }

    // Assistant
    const payload = parseAssistantPayload(msg.message);
    return (
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: "#2c3e50", flexShrink: 0, mt: 0.3 }}>
                <BotIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                    sx={{
                        background: "#f8f9fa",
                        border: "1px solid #e9ecef",
                        borderRadius: "18px 18px 18px 4px",
                        px: 2,
                        py: 1,
                        mb: payload.products.length > 0 ? 1 : 0,
                    }}
                >
                    <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {payload.message}
                    </Typography>
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
                            "&::-webkit-scrollbar-thumb": { bgcolor: "#ddd", borderRadius: 2 },
                        }}
                    >
                        {payload.products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                acceptanceId={msg.acceptanceId}
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

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
    return (
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: "#2c3e50", flexShrink: 0, mt: 0.3 }}>
                <BotIcon sx={{ fontSize: 16 }} />
            </Avatar>
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

// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatbotWidget() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Stable IDs for the lifetime of the widget
    const conversationId = useRef(crypto.randomUUID());
    const userId = useRef(
        authService.getCurrentUser()?.id ?? crypto.randomUUID()
    );

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || loading) return;

        const newUserMsg: ChatMessage = { sender: "user", message: text };
        // Optimistically add user message
        const updatedMessages = [...messages, newUserMsg];
        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            const data = await chatbotService.sendMessage(
                conversationId.current,
                userId.current,
                updatedMessages
            );

            // Check if backend returned products in assistant messages to create AI acceptance record
            const newMessages = [...data.messages];
            for (let i = newMessages.length - 1; i >= 0; i--) {
                const msg = newMessages[i];
                if (msg && msg.sender === "assistant") {
                    const payload = parseAssistantPayload(msg.message);
                    if (payload.products && payload.products.length > 0 && !msg.acceptanceId) {
                        try {
                            const acceptanceId = await aiAcceptanceService.createAcceptanceRecord(userId.current);
                            newMessages[i] = { sender: msg.sender, message: msg.message, acceptanceId };
                        } catch (e) {
                            console.error("Failed to create AI acceptance record:", e);
                        }
                        break; // Usually there's only one latest product response
                    }
                }
            }

            // Replace entire messages array with server response (context preservation & acceptance IDs attached)
            setMessages(newMessages);
        } catch (e) {
            showToast("Không thể kết nối chatbot. Vui lòng thử lại.", "error");
            // Rollback
            setMessages(messages);
        } finally {
            setLoading(false);
        }
    }, [input, loading, messages, showToast]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleAddToCart = useCallback(
        async (variantId: string, productName: string) => {
            try {
                await cartService.addItem(variantId, 1);
                showToast(`Đã thêm "${productName}" vào giỏ hàng!`, "success");
            } catch {
                showToast("Thêm vào giỏ hàng thất bại. Vui lòng thử lại.", "error");
            }
        },
        [showToast]
    );

    const handleNavigate = useCallback((productId: string) => {
        setOpen(false); // Close chatbot when navigating
        navigate(`/products/${productId}`);
    }, [navigate]);

    return (
        <>
            {/* Chat Window */}
            {open && (
                <Paper
                    elevation={10}
                    sx={{
                        position: "fixed",
                        bottom: 96,
                        right: 24,
                        width: { xs: "calc(100vw - 32px)", sm: "65vw", md: "60vw", lg: "55vw" },
                        maxWidth: 700,
                        minWidth: 320,
                        height: { xs: "70vh", sm: "72vh" },
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        overflow: "hidden",
                        zIndex: 1300,
                        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                        animation: "slideUp 0.25s ease-out",
                        "@keyframes slideUp": {
                            from: { opacity: 0, transform: "translateY(20px)" },
                            to: { opacity: 1, transform: "translateY(0)" },
                        },
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            background: "linear-gradient(135deg, #1a1a2e 0%, #c0392b 100%)",
                            color: "#fff",
                            px: 2.5,
                            py: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            flexShrink: 0,
                        }}
                    >
                        <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.15)" }}>
                            <BotIcon sx={{ fontSize: 20 }} />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
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
                            onClick={() => setOpen(false)}
                            sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.1)" } }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Divider />

                    {/* Messages */}
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
                            "&::-webkit-scrollbar-thumb": { bgcolor: "#dee2e6", borderRadius: 3 },
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
                                <Avatar sx={{ width: 64, height: 64, bgcolor: "#fef3f2" }}>
                                    <BotIcon sx={{ fontSize: 36, color: "#c0392b" }} />
                                </Avatar>
                                <Box sx={{ textAlign: "center" }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                                        Xin chào! Tôi là PerfumeGPT 👋
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 280 }}>
                                        Hãy hỏi tôi về nước hoa – tôi sẽ gợi ý những sản phẩm phù hợp nhất cho bạn!
                                    </Typography>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
                                    {["Gợi ý nước hoa nam", "Nước hoa nữ dịu nhẹ", "Nước hoa tặng quà"].map((s) => (
                                        <Chip
                                            key={s}
                                            label={s}
                                            onClick={() => setInput(s)}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                borderColor: "#c0392b",
                                                color: "#c0392b",
                                                cursor: "pointer",
                                                "&:hover": { bgcolor: "#fef3f2" },
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {messages.map((msg, idx) => (
                            <MessageBubble key={idx} msg={msg} onAddToCart={handleAddToCart} onNavigate={handleNavigate} />
                        ))}

                        {loading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* Input area */}
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
                        <TextField
                            fullWidth
                            multiline
                            maxRows={4}
                            placeholder="Nhập tin nhắn…"
                            size="small"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: 3,
                                    bgcolor: "#f8f9fa",
                                    "& fieldset": { borderColor: "#e9ecef" },
                                    "&:hover fieldset": { borderColor: "#c0392b" },
                                    "&.Mui-focused fieldset": { borderColor: "#c0392b" },
                                },
                            }}
                        />
                        <Tooltip title="Gửi (Enter)">
                            <span>
                                <IconButton
                                    onClick={handleSend}
                                    disabled={loading || !input.trim()}
                                    sx={{
                                        bgcolor: "#c0392b",
                                        color: "#fff",
                                        borderRadius: 2.5,
                                        width: 40,
                                        height: 40,
                                        flexShrink: 0,
                                        "&:hover": { bgcolor: "#e74c3c" },
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
                    </Box>
                </Paper>
            )}

            {/* Toggle Button */}
            <Tooltip title={open ? "Đóng chat" : "Hỏi PerfumeGPT"} placement="left">
                <IconButton
                    onClick={() => setOpen((prev) => !prev)}
                    sx={{
                        position: "fixed",
                        bottom: 24,
                        right: 24,
                        width: 56,
                        height: 56,
                        zIndex: 1300,
                        background: open
                            ? "linear-gradient(135deg, #2c3e50 0%, #4a4a6a 100%)"
                            : "linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(192,57,43,0.5)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                            transform: "scale(1.08)",
                            boxShadow: "0 6px 24px rgba(192,57,43,0.6)",
                        },
                    }}
                >
                    {open ? <CloseIcon /> : <ChatIcon />}
                </IconButton>
            </Tooltip>
        </>
    );
}
