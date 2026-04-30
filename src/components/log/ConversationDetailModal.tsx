import {
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AdminConversation, ServerMessage } from "@/types/conversation";

interface ConversationDetailModalProps {
    open: boolean;
    onClose: () => void;
    selectedConversation: AdminConversation | null;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

function parseMessageContent(msg: ServerMessage): string {
    let text = msg.message;
    try {
        const parsed = JSON.parse(text);
        if (parsed.message) text = parsed.message;
    } catch {
        // keep raw
    }
    return text;
}

export const ConversationDetailModal = ({ open, onClose, selectedConversation }: ConversationDetailModalProps) => {
    if (!selectedConversation) return null;

    const sortedMessages = [...(selectedConversation.messages || [])].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: "bold" }}>
                Chi tiết Hội thoại: {selectedConversation.id}
            </DialogTitle>
            <DialogContent dividers>
                {selectedConversation.userId && (
                    <Typography variant="subtitle1" gutterBottom>
                        <strong>User ID:</strong> {selectedConversation.userId}
                    </Typography>
                )}

                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>
                    Nội dung Chat ({sortedMessages.length})
                </Typography>

                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        p: 3,
                        bgcolor: "#f5f7fa",
                        borderRadius: 3,
                        maxHeight: "65vh",
                        overflowY: "auto",
                    }}
                >
                    {sortedMessages.length > 0 ? (
                        sortedMessages.map((msg) => {
                            const text = parseMessageContent(msg);
                            const isUser = msg.sender === 'user';

                            return (
                                <Box
                                    key={msg.id}
                                    sx={{
                                        display: "flex",
                                        flexDirection: isUser ? "row-reverse" : "row",
                                        alignItems: "flex-end",
                                        gap: 1.5,
                                        alignSelf: isUser ? "flex-end" : "flex-start",
                                        maxWidth: "85%",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            bgcolor: isUser ? "primary.main" : "secondary.main",
                                            color: "white",
                                            fontWeight: "bold",
                                            fontSize: "0.85rem",
                                            boxShadow: 1
                                        }}
                                    >
                                        {isUser ? "U" : "AI"}
                                    </Box>

                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                                        <Box
                                            sx={{
                                                bgcolor: isUser ? "primary.main" : "white",
                                                color: isUser ? "primary.contrastText" : "text.primary",
                                                p: 2,
                                                borderRadius: 3,
                                                borderBottomRightRadius: isUser ? 0 : 3,
                                                borderBottomLeftRadius: !isUser ? 0 : 3,
                                                boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                                                border: "1px solid",
                                                borderColor: isUser ? "primary.dark" : "grey.200",
                                                position: "relative",
                                                "& p": { m: 0, mb: 1 },
                                                "& p:last-child": { mb: 0 },
                                                "& ul, & ol": { m: 0, mb: 1, pl: 3 },
                                                "& li": { mb: 0.3 },
                                                "& strong, & b": { fontWeight: 600 },
                                                "& code": {
                                                    bgcolor: isUser ? "rgba(255,255,255,0.15)" : "grey.100",
                                                    px: 0.5,
                                                    py: 0.15,
                                                    borderRadius: 0.5,
                                                    fontSize: "0.85em",
                                                },
                                                "& pre": {
                                                    bgcolor: isUser ? "rgba(255,255,255,0.1)" : "grey.50",
                                                    p: 1.5,
                                                    borderRadius: 1,
                                                    overflowX: "auto",
                                                    fontSize: "0.85em",
                                                },
                                                "& h1, & h2, & h3, & h4": {
                                                    m: 0,
                                                    mb: 0.5,
                                                    mt: 1,
                                                    fontWeight: 600,
                                                    fontSize: "1em",
                                                },
                                            }}
                                        >
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {text}
                                            </ReactMarkdown>
                                        </Box>

                                        {msg.createdAt && (
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 1 }}>
                                                {formatDate(msg.createdAt)}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })
                    ) : (
                        <Box sx={{ textAlign: "center", my: 5 }}>
                            <Typography variant="body1" color="text.secondary">
                                Chưa có tin nhắn nào trong cuộc hội thoại này.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};
