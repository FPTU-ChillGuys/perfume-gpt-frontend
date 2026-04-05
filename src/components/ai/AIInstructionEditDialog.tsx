import { useState, useEffect } from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from "@mui/material";
import {
    Close as CloseIcon,
    Save as SaveIcon,
    SmartToy as BotIcon,
} from "@mui/icons-material";
import type { AiInstruction } from "@/types/aiInstruction";

interface Props {
    open: boolean;
    isSaving: boolean;
    initialData: AiInstruction | null;
    onClose: () => void;
    onSubmit: (content: string) => void;
}

export default function AIInstructionEditDialog({ open, isSaving, initialData, onClose, onSubmit }: Props) {
    // Local state — keystrokes only re-render this dialog, not the whole page
    const [content, setContent] = useState("");

    useEffect(() => {
        if (open && initialData) {
            setContent(initialData.instruction);
        }
    }, [open, initialData]);

    return (
        <Dialog
            open={open}
            onClose={!isSaving ? onClose : undefined}
            maxWidth="lg"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, maxHeight: "90vh" } }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    pb: 2,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <BotIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Cập nhật chỉ thị
                    </Typography>
                    {initialData && (
                        <Chip
                            label={initialData.instructionType}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ ml: 1, fontWeight: "bold" }}
                        />
                    )}
                </Box>
                <IconButton onClick={onClose} disabled={isSaving} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 4, bgcolor: "background.default" }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ m: 1, fontWeight: "bold" }}>
                    Nội dung chỉ thị (Markdown / Text)
                </Typography>
                <Box
                    sx={{
                        position: "relative",
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "grey.300",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                        bgcolor: "#1e1e1e",
                    }}
                >
                    <TextField
                        multiline
                        fullWidth
                        minRows={18}
                        maxRows={24}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isSaving}
                        variant="outlined"
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                fontFamily: '"Fira Code", "Consolas", monospace',
                                color: "#d4d4d4",
                                fontSize: "0.9rem",
                                lineHeight: 1.6,
                                p: 3,
                                "& fieldset": { border: "none" },
                            },
                        }}
                        placeholder="Nhập nội dung chỉ thị tại đây..."
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Button onClick={onClose} color="inherit" disabled={isSaving} sx={{ px: 3, py: 1, borderRadius: 2 }}>
                    Hủy
                </Button>
                <Button
                    onClick={() => onSubmit(content)}
                    variant="contained"
                    color="primary"
                    disabled={isSaving || !content.trim()}
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    sx={{ px: 4, py: 1, borderRadius: 2, fontWeight: "bold" }}
                >
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
