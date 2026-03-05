import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box,
    Button,
    CircularProgress,
    Container,
    InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {
    Add as AddIcon,
    Quiz as QuizIcon,
    Search as SearchIcon,
} from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import { quizService } from "@/services/ai/quizService";
import { QuestionType } from "@/types/quiz";
import type { QuizQuestion } from "@/types/quiz";
import { AdminLayout } from "@/layouts/AdminLayout";
import QuizQuestionRow from "@/components/quiz/admin/QuizQuestionRow";
import QuizAddDialog from "@/components/quiz/admin/QuizAddDialog";
import QuizEditDialog from "@/components/quiz/admin/QuizEditDialog";
import QuizDeleteDialog from "@/components/quiz/admin/QuizDeleteDialog";

export default function QuizManagementPage() {
    const { showToast } = useToast();

    // ── List state ────────────────────────────────────────────────
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // ── Add dialog state ──────────────────────────────────────────
    const [addOpen, setAddOpen] = useState(false);
    const [newQuestion, setNewQuestion] = useState("");
    const [newQuestionType, setNewQuestionType] = useState<QuestionType>(QuestionType.SINGLE);
    const [newAnswers, setNewAnswers] = useState<string[]>(["", ""]);
    const [isCreating, setIsCreating] = useState(false);

    // ── Edit dialog state ─────────────────────────────────────────
    const [editOpen, setEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<QuizQuestion | null>(null);
    const [editQuestion, setEditQuestion] = useState("");
    const [editQuestionType, setEditQuestionType] = useState<QuestionType>(QuestionType.SINGLE);
    const [editAnswers, setEditAnswers] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // ── Delete dialog state ───────────────────────────────────────
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<QuizQuestion | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Data fetching ─────────────────────────────────────────────
    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await quizService.getQuestions();
            setQuestions(response.data.reverse());
        } catch (error) {
            console.error("Failed to fetch quiz questions:", error);
            showToast("Lỗi khi tải danh sách câu hỏi Quiz", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    const filteredQuestions = useMemo(() => {
        if (!searchQuery.trim()) return questions;
        const q = searchQuery.toLowerCase();
        return questions.filter(
            (item) =>
                item.question.toLowerCase().includes(q) ||
                item.answers.some((a) => a.answer.toLowerCase().includes(q))
        );
    }, [questions, searchQuery]);

    // ── Row toggle ────────────────────────────────────────────────
    const handleToggleRow = useCallback((id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    // ── Add handlers ──────────────────────────────────────────────
    const handleOpenAdd = useCallback(() => {
        setNewQuestion("");
        setNewQuestionType(QuestionType.SINGLE);
        setNewAnswers(["", ""]);
        setAddOpen(true);
    }, []);

    const handleCloseAdd = useCallback(() => {
        if (!isCreating) setAddOpen(false);
    }, [isCreating]);

    const handleNewAnswerChange = useCallback((index: number, value: string) => {
        setNewAnswers((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, []);

    const handleAddNewAnswer = useCallback(() => setNewAnswers((prev) => [...prev, ""]), []);

    const handleRemoveNewAnswer = useCallback((index: number) => {
        setNewAnswers((prev) => prev.length <= 2 ? prev : prev.filter((_, i) => i !== index));
    }, []);

    const handleCreate = useCallback(async () => {
        if (!newQuestion.trim()) {
            showToast("Nội dung câu hỏi không được để trống", "warning");
            return;
        }
        const filled = newAnswers.filter((a) => a.trim());
        if (filled.length < 2) {
            showToast("Phải có ít nhất 2 câu trả lời", "warning");
            return;
        }
        setIsCreating(true);
        try {
            await quizService.createQuestion({
                question: newQuestion.trim(),
                questionType: newQuestionType,
                answers: filled.map((a) => ({ answer: a.trim() })),
            });
            showToast("Tạo câu hỏi thành công!", "success");
            setAddOpen(false);
            fetchQuestions();
        } catch (error) {
            console.error("Error creating question:", error);
            showToast("Đã có lỗi xảy ra khi tạo câu hỏi", "error");
        } finally {
            setIsCreating(false);
        }
    }, [newQuestion, newQuestionType, newAnswers, showToast, fetchQuestions]);

    // ── Edit handlers ─────────────────────────────────────────────
    const handleOpenEdit = useCallback((item: QuizQuestion) => {
        setEditingItem(item);
        setEditQuestion(item.question);
        setEditQuestionType(item.questionType);
        setEditAnswers(item.answers.map((a) => a.answer));
        setEditOpen(true);
    }, []);

    const handleCloseEdit = useCallback(() => {
        if (!isSaving) {
            setEditOpen(false);
            setEditingItem(null);
        }
    }, [isSaving]);

    const handleEditAnswerChange = useCallback((index: number, value: string) => {
        setEditAnswers((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, []);

    const handleAddEditAnswer = useCallback(() => setEditAnswers((prev) => [...prev, ""]), []);

    const handleRemoveEditAnswer = useCallback((index: number) => {
        setEditAnswers((prev) => prev.length <= 2 ? prev : prev.filter((_, i) => i !== index));
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingItem) return;
        if (!editQuestion.trim()) {
            showToast("Nội dung câu hỏi không được để trống", "warning");
            return;
        }
        const filled = editAnswers.filter((a) => a.trim());
        if (filled.length < 2) {
            showToast("Phải có ít nhất 2 câu trả lời", "warning");
            return;
        }
        setIsSaving(true);
        try {
            await quizService.updateQuestion(editingItem.id, {
                question: editQuestion.trim(),
                questionType: editQuestionType,
                answers: filled.map((a) => ({ answer: a.trim() })),
            });
            showToast("Cập nhật câu hỏi thành công!", "success");
            fetchQuestions();
            handleCloseEdit();
        } catch (error) {
            console.error("Error updating question:", error);
            showToast("Đã có lỗi xảy ra khi cập nhật câu hỏi", "error");
        } finally {
            setIsSaving(false);
        }
    }, [editingItem, editQuestion, editQuestionType, editAnswers, showToast, fetchQuestions, handleCloseEdit]);

    // ── Delete handlers ───────────────────────────────────────────
    const handleOpenDelete = useCallback((item: QuizQuestion) => {
        setDeletingItem(item);
        setDeleteOpen(true);
    }, []);

    const handleCloseDelete = useCallback(() => {
        if (!isDeleting) {
            setDeleteOpen(false);
            setDeletingItem(null);
        }
    }, [isDeleting]);

    const handleConfirmDelete = useCallback(async () => {
        if (!deletingItem) return;
        setIsDeleting(true);
        try {
            await quizService.deleteQuestion(deletingItem.id);
            showToast("Xóa câu hỏi thành công!", "success");
            setQuestions((prev) => prev.filter((q) => q.id !== deletingItem.id));
            handleCloseDelete();
        } catch (error) {
            console.error("Error deleting question:", error);
            showToast("Đã có lỗi xảy ra khi xóa câu hỏi", "error");
        } finally {
            setIsDeleting(false);
        }
    }, [deletingItem, showToast, handleCloseDelete]);

    // ── Render ────────────────────────────────────────────────────
    if (loading) {
        return (
            <AdminLayout>
                <Container maxWidth="xl">
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
                        <CircularProgress />
                    </Box>
                </Container>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <Container maxWidth="xl">
                <Paper sx={{ width: "100%", overflow: "hidden" }}>
                    <Box sx={{ p: 3 }}>
                        {/* Header */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                            <QuizIcon color="primary" sx={{ fontSize: 28 }} />
                            <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>
                                Quản lý Quiz
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenAdd}
                                sx={{ borderRadius: 2, fontWeight: "bold", px: 3 }}
                            >
                                Thêm câu hỏi
                            </Button>
                        </Box>

                        {/* Search */}
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                            <TextField
                                placeholder="Tìm kiếm câu hỏi hoặc câu trả lời..."
                                variant="outlined"
                                size="small"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ minWidth: { xs: "100%", sm: 400 }, bgcolor: "#fff" }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Tổng số: <strong>{filteredQuestions.length}</strong> câu hỏi
                            </Typography>
                        </Box>

                        {/* Table */}
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: "#f8f9fa" }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: "bold", width: 48 }} />
                                        <TableCell sx={{ fontWeight: "bold" }}>Câu hỏi</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", width: 130 }}>Loại</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", width: 110 }}>Số đáp án</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", width: 160 }}>Ngày tạo</TableCell>
                                        <TableCell sx={{ fontWeight: "bold", width: 100, textAlign: "center" }}>Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredQuestions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Không tìm thấy dữ liệu phù hợp.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredQuestions.map((item) => (
                                            <QuizQuestionRow
                                                key={item.id}
                                                item={item}
                                                isExpanded={expandedRows.has(item.id)}
                                                onToggle={handleToggleRow}
                                                onEdit={handleOpenEdit}
                                                onDelete={handleOpenDelete}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            </Container>

            {/* Dialogs */}
            <QuizAddDialog
                open={addOpen}
                isCreating={isCreating}
                question={newQuestion}
                questionType={newQuestionType}
                answers={newAnswers}
                onClose={handleCloseAdd}
                onQuestionChange={setNewQuestion}
                onQuestionTypeChange={setNewQuestionType}
                onAnswerChange={handleNewAnswerChange}
                onAddAnswer={handleAddNewAnswer}
                onRemoveAnswer={handleRemoveNewAnswer}
                onSubmit={handleCreate}
            />

            <QuizEditDialog
                open={editOpen}
                isSaving={isSaving}
                question={editQuestion}
                questionType={editQuestionType}
                answers={editAnswers}
                onClose={handleCloseEdit}
                onQuestionChange={setEditQuestion}
                onQuestionTypeChange={setEditQuestionType}
                onAnswerChange={handleEditAnswerChange}
                onAddAnswer={handleAddEditAnswer}
                onRemoveAnswer={handleRemoveEditAnswer}
                onSubmit={handleSaveEdit}
            />

            <QuizDeleteDialog
                open={deleteOpen}
                item={deletingItem}
                isDeleting={isDeleting}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
            />
        </AdminLayout>
    );
}
