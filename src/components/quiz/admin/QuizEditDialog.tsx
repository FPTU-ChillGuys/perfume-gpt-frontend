import { useState, useEffect } from "react";
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
    AddCircleOutline as AddAnswerIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    RemoveCircleOutline as RemoveAnswerIcon,
    Save as SaveIcon,
} from "@mui/icons-material";
import { QuestionType } from "@/types/quiz";
import type { QuizQuestion } from "@/types/quiz";

interface SubmitPayload {
    question: string;
    questionType: QuestionType;
    answers: { answer: string }[];
}

interface Props {
    open: boolean;
    isSaving: boolean;
    initialData: QuizQuestion | null; // seed state when dialog opens
    onClose: () => void;
    onSubmit: (payload: SubmitPayload) => void;
}

export default function QuizEditDialog({ open, isSaving, initialData, onClose, onSubmit }: Props) {
    // Local form state — keystrokes stay inside this component
    const [question, setQuestion] = useState("");
    const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.SINGLE);
    const [answers, setAnswers] = useState<string[]>([]);

    // Seed local state whenever a new item is opened
    useEffect(() => {
        if (open && initialData) {
            setQuestion(initialData.question);
            setQuestionType(initialData.questionType);
            setAnswers(initialData.answers.map((a) => a.answer));
        }
    }, [open, initialData]);

    const handleAnswerChange = (index: number, value: string) => {
        setAnswers((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleAddAnswer = () => setAnswers((prev) => [...prev, ""]);

    const handleRemoveAnswer = (index: number) => {
        setAnswers((prev) => prev.length <= 2 ? prev : prev.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        const filled = answers.filter((a) => a.trim());
        onSubmit({
            question: question.trim(),
            questionType,
            answers: filled.map((a) => ({ answer: a.trim() })),
        });
    };

    const filledCount = answers.filter((a) => a.trim()).length;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
                    <EditIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Chỉnh sửa câu hỏi</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isSaving} size="small">
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
                    onChange={(_, v) => { if (v) setQuestionType(v); }}
                    size="small"
                    sx={{ mb: 2.5 }}
                    disabled={isSaving}
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
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={isSaving}
                    sx={{ mb: 3 }}
                />

                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                        Danh sách câu trả lời * (tối thiểu 2)
                    </Typography>
                    <Button size="small" startIcon={<AddAnswerIcon />} onClick={handleAddAnswer} disabled={isSaving}>
                        Thêm đáp án
                    </Button>
                </Box>

                {answers.map((ans, idx) => (
                    <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                        <Chip label={idx + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32, fontWeight: "bold" }} />
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={`Đáp án ${idx + 1}...`}
                            value={ans}
                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                            disabled={isSaving}
                        />
                        <IconButton size="small" color="error" onClick={() => handleRemoveAnswer(idx)} disabled={answers.length <= 2 || isSaving}>
                            <RemoveAnswerIcon />
                        </IconButton>
                    </Box>
                ))}

                {filledCount < 2 && (
                    <Alert severity="warning" sx={{ mt: 1 }}>Cần ít nhất 2 đáp án hợp lệ</Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Button onClick={onClose} color="inherit" disabled={isSaving} sx={{ px: 3, borderRadius: 2 }}>Hủy</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                    sx={{ px: 4, borderRadius: 2, fontWeight: "bold" }}
                >
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
