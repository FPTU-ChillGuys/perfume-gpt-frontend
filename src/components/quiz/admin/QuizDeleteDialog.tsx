import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import type { QuizQuestion } from "@/types/quiz";

interface Props {
    open: boolean;
    item: QuizQuestion | null;
    isDeleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function QuizDeleteDialog({ open, item, isDeleting, onClose, onConfirm }: Props) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
                <DeleteIcon color="error" />
                <Typography variant="h6" fontWeight="bold">
                    Xác nhận xóa câu hỏi
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Hành động này sẽ <strong>soft delete</strong> câu hỏi và không thể hoàn tác.
                </Alert>
                {item && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="body1" fontWeight={500}>
                            {item.question}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {item.answers.length} câu trả lời
                        </Typography>
                    </Paper>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5, pt: 0 }}>
                <Button onClick={onClose} color="inherit" disabled={isDeleting} sx={{ borderRadius: 2 }}>
                    Hủy
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color="error"
                    disabled={isDeleting}
                    startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
                    sx={{ borderRadius: 2, fontWeight: "bold", px: 3 }}
                >
                    {isDeleting ? "Đang xóa..." : "Xóa"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
