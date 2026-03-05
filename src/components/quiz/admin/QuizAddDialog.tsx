import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import {
    Add as AddIcon,
    AddCircleOutline as AddAnswerIcon,
    Close as CloseIcon,
    Quiz as QuizIcon,
    RemoveCircleOutline as RemoveAnswerIcon,
} from "@mui/icons-material";
import { QuestionType } from "@/types/quiz";

interface Props {
    open: boolean;
    isCreating: boolean;
    question: string;
    questionType: QuestionType;
    answers: string[];
    onClose: () => void;
    onQuestionChange: (v: string) => void;
    onQuestionTypeChange: (v: QuestionType) => void;
    onAnswerChange: (index: number, value: string) => void;
    onAddAnswer: () => void;
    onRemoveAnswer: (index: number) => void;
    onSubmit: () => void;
}

export default function QuizAddDialog({
    open,
    isCreating,
    question,
    questionType,
    answers,
    onClose,
    onQuestionChange,
    onQuestionTypeChange,
    onAnswerChange,
    onAddAnswer,
    onRemoveAnswer,
    onSubmit,
}: Props) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <QuizIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Thêm câu hỏi mới
                    </Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isCreating} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                    Loại câu hỏi
                </Typography>
                <ToggleButtonGroup
                    value={questionType}
                    exclusive
                    onChange={(_, v) => { if (v) onQuestionTypeChange(v); }}
                    size="small"
                    sx={{ mb: 2.5 }}
                    disabled={isCreating}
                >
                    <ToggleButton value={QuestionType.SINGLE}>Một đáp án (single)</ToggleButton>
                    <ToggleButton value={QuestionType.MULTIPLE}>Nhiều đáp án (multiple)</ToggleButton>
                </ToggleButtonGroup>

                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                    Nội dung câu hỏi *
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    variant="outlined"
                    placeholder="Nhập câu hỏi..."
                    value={question}
                    onChange={(e) => onQuestionChange(e.target.value)}
                    disabled={isCreating}
                    sx={{ mb: 3 }}
                />

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                        Danh sách câu trả lời * (tối thiểu 2)
                    </Typography>
                    <Button size="small" startIcon={<AddAnswerIcon />} onClick={onAddAnswer} disabled={isCreating}>
                        Thêm đáp án
                    </Button>
                </Box>

                {answers.map((ans, idx) => (
                    <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                        <Chip
                            label={idx + 1}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ minWidth: 32, fontWeight: "bold" }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={`Đáp án ${idx + 1}...`}
                            value={ans}
                            onChange={(e) => onAnswerChange(idx, e.target.value)}
                            disabled={isCreating}
                        />
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() => onRemoveAnswer(idx)}
                            disabled={answers.length <= 2 || isCreating}
                        >
                            <RemoveAnswerIcon />
                        </IconButton>
                    </Box>
                ))}

                {answers.filter((a) => a.trim()).length < 2 && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        Cần ít nhất 2 đáp án hợp lệ
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Button onClick={onClose} color="inherit" disabled={isCreating} sx={{ px: 3, borderRadius: 2 }}>
                    Hủy
                </Button>
                <Button
                    onClick={onSubmit}
                    variant="contained"
                    color="primary"
                    disabled={isCreating}
                    startIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                    sx={{ px: 4, borderRadius: 2, fontWeight: "bold" }}
                >
                    {isCreating ? "Đang tạo..." : "Tạo câu hỏi"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
