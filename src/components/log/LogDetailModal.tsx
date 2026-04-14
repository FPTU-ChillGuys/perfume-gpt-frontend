import {
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Divider,
} from "@mui/material";
import type { UserLog } from "@/types/log";
import { getUserLogEventTypeLabel } from "@/utils/userLogLabels";

interface LogDetailModalProps {
    open: boolean;
    onClose: () => void;
    selectedLog: UserLog | null;
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const LogDetailModal = ({ open, onClose, selectedLog }: LogDetailModalProps) => {
    if (!selectedLog) return null;
        const eventTypeLabel = getUserLogEventTypeLabel(selectedLog.eventType);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: "bold" }}>Chi tiết Log: {selectedLog.id}</DialogTitle>
            <DialogContent dividers>
                <Typography variant="subtitle1" gutterBottom>
                    <strong>User ID:</strong> {selectedLog.userId || "Khach"}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    <strong>Loại sự kiện:</strong> {eventTypeLabel}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    <strong>Entity Type:</strong> {selectedLog.entityType || "N/A"}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    <strong>Entity ID:</strong> {selectedLog.entityId || "N/A"}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>
                    Noi dung
                </Typography>
                <Box
                    sx={{
                        bgcolor: "grey.50",
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 2,
                    }}
                >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {selectedLog.contentText || "Khong co noi dung"}
                    </Typography>
                </Box>

                <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
                    Metadata
                </Typography>
                <Box
                    component="pre"
                    sx={{
                        bgcolor: "grey.100",
                        p: 2,
                        borderRadius: 1,
                        overflowX: "auto",
                        fontSize: "0.875rem",
                        maxHeight: 300,
                    }}
                >
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary">
                    Tao luc: {formatDate(selectedLog.createdAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Cap nhat luc: {formatDate(selectedLog.updatedAt)}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};
