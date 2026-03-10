import { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
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
    Paper,
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
    DeleteOutline as DeleteIcon,
} from "@mui/icons-material";
import { QuestionType } from "@/types/quiz";
import type { QuizQuestionRequest } from "@/types/quiz";

interface Props {
    open: boolean;
    isCreating: boolean;
    onClose: () => void;
    onSubmit: (payload: QuizQuestionRequest[]) => void;
}

interface QuestionForm {
    id: string; // for React key
    question: string;
    questionType: QuestionType;
    answers: string[];
}

export default function QuizAddDialog({ open, isCreating, onClose, onSubmit }: Props) {
    const createEmptyForm = (): QuestionForm => ({
        id: uuid(),
        question: "",
        questionType: QuestionType.SINGLE,
        answers: ["", ""],
    });

    const [forms, setForms] = useState<QuestionForm[]>([createEmptyForm()]);

    // Reset when dialog opens
    useEffect(() => {
        if (open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setForms([createEmptyForm()]);
        }
    }, [open]);

    const handleAddForm = () => {
        setForms((prev) => [...prev, createEmptyForm()]);
    };

    const handleRemoveForm = (id: string) => {
        setForms((prev) => prev.filter((f) => f.id !== id));
    };

    const updateForm = (id: string, field: keyof QuestionForm, value: any) => {
        setForms((prev) =>
            prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
        );
    };

    const updateAnswer = (formId: string, answerIndex: number, value: string) => {
        setForms((prev) =>
            prev.map((f) => {
                if (f.id !== formId) return f;
                const newAnswers = [...f.answers];
                newAnswers[answerIndex] = value;
                return { ...f, answers: newAnswers };
            })
        );
    };

    const handleAddAnswer = (formId: string) => {
        setForms((prev) =>
            prev.map((f) => (f.id === formId ? { ...f, answers: [...f.answers, ""] } : f))
        );
    };

    const handleRemoveAnswer = (formId: string, answerIndex: number) => {
        setForms((prev) =>
            prev.map((f) => {
                if (f.id !== formId) return f;
                if (f.answers.length <= 2) return f;
                return { ...f, answers: f.answers.filter((_, i) => i !== answerIndex) };
            })
        );
    };

    const handleSubmit = () => {
        const payload: QuizQuestionRequest[] = forms.map((f) => {
            const filled = f.answers.filter((a) => a.trim());
            return {
                question: f.question.trim(),
                questionType: f.questionType,
                answers: filled.map((a) => ({ answer: a.trim() })),
            };
        });
        onSubmit(payload);
    };

    // check if at least one form is invalid
    const isInvalid = forms.some(
        (f) => !f.question.trim() || f.answers.filter((a) => a.trim()).length < 2
    );

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
                    <QuizIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Thêm câu hỏi mới</Typography>
                </Box>
                <IconButton onClick={onClose} disabled={isCreating} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 3, mt: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                {forms.map((form, index) => {
                    const filledCount = form.answers.filter((a) => a.trim()).length;
                    return (
                        <Paper key={form.id} variant="outlined" sx={{ p: 3, position: "relative", borderRadius: 2 }}>
                            {forms.length > 1 && (
                                <IconButton
                                    color="error"
                                    onClick={() => handleRemoveForm(form.id)}
                                    disabled={isCreating}
                                    sx={{ position: "absolute", top: 8, right: 8 }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            )}

                            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                                Câu hỏi {index + 1}
                            </Typography>

                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                                Loại câu hỏi
                            </Typography>
                            <ToggleButtonGroup
                                value={form.questionType}
                                exclusive
                                onChange={(_, v) => { if (v) updateForm(form.id, "questionType", v); }}
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
                                value={form.question}
                                onChange={(e) => updateForm(form.id, "question", e.target.value)}
                                disabled={isCreating}
                                sx={{ mb: 3 }}
                            />

                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                                    Danh sách câu trả lời * (tối thiểu 2)
                                </Typography>
                                <Button size="small" startIcon={<AddAnswerIcon />} onClick={() => handleAddAnswer(form.id)} disabled={isCreating}>
                                    Thêm đáp án
                                </Button>
                            </Box>

                            {form.answers.map((ans, idx) => (
                                <Box key={idx} sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "center" }}>
                                    <Chip label={idx + 1} size="small" color="primary" variant="outlined" sx={{ minWidth: 32, fontWeight: "bold" }} />
                                    <TextField
                                        fullWidth
                                        size="small"
                                        placeholder={`Đáp án ${idx + 1}...`}
                                        value={ans}
                                        onChange={(e) => updateAnswer(form.id, idx, e.target.value)}
                                        disabled={isCreating}
                                    />
                                    <IconButton size="small" color="error" onClick={() => handleRemoveAnswer(form.id, idx)} disabled={form.answers.length <= 2 || isCreating}>
                                        <RemoveAnswerIcon />
                                    </IconButton>
                                </Box>
                            ))}

                            {filledCount < 2 && (
                                <Alert severity="warning" sx={{ mt: 1 }}>Cần ít nhất 2 đáp án hợp lệ</Alert>
                            )}
                        </Paper>
                    );
                })}

                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddForm}
                    disabled={isCreating}
                    sx={{ py: 1.5, borderStyle: "dashed", borderWidth: 2 }}
                >
                    Thêm một câu hỏi nữa
                </Button>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Button onClick={onClose} color="inherit" disabled={isCreating} sx={{ px: 3, borderRadius: 2 }}>Hủy</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={isCreating || isInvalid}
                    startIcon={isCreating ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
                    sx={{ px: 4, borderRadius: 2, fontWeight: "bold" }}
                >
                    {isCreating ? "Đang tạo..." : `Tạo ${forms.length > 1 ? `${forms.length} câu hỏi` : "câu hỏi"}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
