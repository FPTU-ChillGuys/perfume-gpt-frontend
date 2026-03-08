import {
    Box,
    Typography,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Divider,
} from "@mui/material";
import { Assessment as AssessmentIcon } from "@mui/icons-material";
import type { AIInventoryReportLog } from "@/types/inventory";

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

interface InventoryLogDetailDialogProps {
    open: boolean;
    onClose: () => void;
    log: AIInventoryReportLog | null;
}

export const InventoryLogDetailDialog = ({ open, onClose, log }: InventoryLogDetailDialogProps) => {
    if (!log) return null;
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <AssessmentIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Chi tiết Log Báo cáo Tồn kho
                    </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                    ID: {log.id}
                </Typography>
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Box display="flex" flexDirection="column" gap={2} pt={1}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 2,
                        }}
                    >
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Ngày tạo
                            </Typography>
                            <Typography variant="body2">{formatDate(log.createdAt)}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Cập nhật lần cuối
                            </Typography>
                            <Typography variant="body2">{formatDate(log.updatedAt)}</Typography>
                        </Box>
                    </Box>

                    <Divider />

                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom display="block">
                            Nội dung phản hồi AI
                        </Typography>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                maxHeight: 400,
                                overflowY: "auto",
                                bgcolor: "grey.50",
                                borderRadius: 1,
                            }}
                        >
                            <Typography
                                variant="body2"
                                component="pre"
                                sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "inherit", m: 0 }}
                            >
                                {log.inventoryLog || "Không có nội dung"}
                            </Typography>
                        </Paper>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} variant="outlined">
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
