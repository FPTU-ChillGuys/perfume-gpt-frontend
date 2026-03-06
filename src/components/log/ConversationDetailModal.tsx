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
                        gap: 2,
                        p: 2,
                        bgcolor: "grey.50",
                        borderRadius: 2,
                        maxHeight: "60vh",
                        overflowY: "auto",
                    }}
                >
                    {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                        selectedConversation.messages.map((msgRef) => {
                            let parsedMessage = msgRef.message;
                            try {
                                const parsed = JSON.parse(parsedMessage);
                                if (parsed.message) parsedMessage = parsed.message;
                            } catch {
                                // Keep as raw string
                            }

                            // Fallback handling if API returns wrapped message without id
                            const keyId = (msgRef as any).id || Math.random().toString(36).substr(2, 9);
                            const createdAtStr = (msgRef as any).createdAt;
                            const isUser = msgRef.sender === 'user';

                            return (
                                <Box
                                    key={keyId}
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: isUser ? "flex-end" : "flex-start",
                                        maxWidth: "80%",
                                        alignSelf: isUser ? "flex-end" : "flex-start",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            bgcolor: isUser ? "primary.main" : "white",
                                            color: isUser ? "primary.contrastText" : "text.primary",
                                            p: 2,
                                            borderRadius: 2,
                                            borderTopRightRadius: isUser ? 0 : 2,
                                            borderTopLeftRadius: !isUser ? 0 : 2,
                                            boxShadow: 1,
                                            position: "relative",
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                            {parsedMessage}
                                        </Typography>
                                        {(msgRef as any).products && (msgRef as any).products.length > 0 && (
                                            <Box mt={2} p={1} bgcolor="rgba(255,255,255,0.2)" borderRadius={1} border="1px dashed">
                                                <Typography variant="subtitle2">
                                                    Đã gợi ý {(msgRef as any).products.length} sản phẩm
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>
                                    {createdAtStr && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                            {formatDate(createdAtStr)}
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })
                    ) : (
                        <Typography variant="body2" color="text.secondary" align="center">
                            Không có tin nhắn nào
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};
