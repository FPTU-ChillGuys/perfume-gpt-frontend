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
import { getUserLogEventTypeLabel, getUserLogEntityTypeLabel } from "@/utils/userLogLabels";

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
    const entityTypeLabel = getUserLogEntityTypeLabel(selectedLog.entityType);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: "bold" }}>Chi tiết Log</DialogTitle>
            <DialogContent dividers>
                <Typography variant="subtitle1" gutterBottom>
                    <strong>Người dùng:</strong> {selectedLog.userName ?? "Khách"}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    <strong>Loại sự kiện:</strong> {eventTypeLabel}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    <strong>Đối tượng:</strong> {entityTypeLabel}
                </Typography>

                <Typography variant="subtitle1" gutterBottom>
                    <strong>Mã đối tượng:</strong> {selectedLog.entityId || "N/A"}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom sx={{ mt: 2, fontWeight: 600 }}>
                    Nội dung
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
                        {selectedLog.contentText || "Không có nội dung"}
                    </Typography>
                </Box>

                <Typography variant="h6" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
                    Dữ liệu mở rộng
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
                    Tạo lúc: {formatDate(selectedLog.createdAt)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Cập nhật lúc: {formatDate(selectedLog.updatedAt)}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="primary">Đóng</Button>
            </DialogActions>
        </Dialog>
    );
};
