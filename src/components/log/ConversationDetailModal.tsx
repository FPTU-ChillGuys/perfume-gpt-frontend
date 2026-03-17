import {
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";
import type { AdminConversation } from "@/types/conversation";

interface ConversationDetailModalProps {
    open: boolean;
    onClose: () => void;
    selectedConversation: AdminConversation | null;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const ConversationDetailModal = ({ open, onClose, selectedConversation }: ConversationDetailModalProps) => {
    if (!selectedConversation) return null;

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
                    Nội dung Chat ({selectedConversation.messages?.length || 0})
                </Typography>

                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        p: 3,
                        bgcolor: "#f5f7fa", // Thêm màu nền nhạt giống messenger
                        borderRadius: 3,
                        maxHeight: "65vh",
                        overflowY: "auto",
                    }}
                >
                    {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                        [...selectedConversation.messages].sort((a: any, b: any) => {
                            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                            return timeA - timeB;
                        }).map((msgRef) => {
                            let parsedMessage = msgRef.message;
                            try {
                                const parsed = JSON.parse(parsedMessage);
                                if (parsed.message) parsedMessage = parsed.message;
                            } catch {
                                // Giữ nguyên dạng raw
                            }

                            const keyId = (msgRef as any).id;
                            const createdAtStr = (msgRef as any).createdAt;
                            const isUser = msgRef.sender === 'user';

                            return (
                                <Box
                                    key={keyId}
                                    sx={{
                                        display: "flex",
                                        flexDirection: isUser ? "row-reverse" : "row",
                                        alignItems: "flex-end",
                                        gap: 1.5,
                                        alignSelf: isUser ? "flex-end" : "flex-start",
                                        maxWidth: "85%",
                                    }}
                                >
                                    {/* Avatar */}
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

                                    {/* Chat Bubble */}
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
                                            }}
                                        >
                                            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                                {parsedMessage}
                                            </Typography>
                                            {(msgRef as any).products && (msgRef as any).products.length > 0 && (
                                                <Box mt={2} p={1.5} bgcolor={isUser ? "rgba(255,255,255,0.15)" : "grey.50"} borderRadius={2} border="1px dashed" borderColor={isUser ? "rgba(255,255,255,0.4)" : "grey.300"}>
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        🎁 Đã gợi ý {(msgRef as any).products.length} sản phẩm
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Timestamp */}
                                        {createdAtStr && (
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, px: 1 }}>
                                                {formatDate(createdAtStr)}
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
