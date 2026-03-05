import { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    TextField,
    InputAdornment,
    CircularProgress,
    Container,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Paper,
    Collapse,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    Divider,
    Alert,
} from "@mui/material";
import {
    Search as SearchIcon,
    Quiz as QuizIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Close as CloseIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    AddCircleOutline as AddAnswerIcon,
    RemoveCircleOutline as RemoveAnswerIcon,
} from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import { quizService } from "@/services/ai/quizService";
import type { QuizQuestion } from "@/types/quiz";
import { AdminLayout } from "@/layouts/AdminLayout";
import dayjs from "dayjs";

export default function QuizManagementPage() {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Expandable rows
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Add question dialog
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newQuestion, setNewQuestion] = useState("");
    const [newAnswers, setNewAnswers] = useState<string[]>(["", ""]);
    const [isCreating, setIsCreating] = useState(false);

    // Delete confirmation dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<QuizQuestion | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showToast } = useToast();

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const response = await quizService.getQuestions();
            setQuestions(response.data);
        } catch (error) {
            console.error("Failed to fetch quiz questions:", error);
            showToast("Lỗi khi tải danh sách câu hỏi Quiz", "error");
        } finally {
            setLoading(false);
        }
    };

    const filteredQuestions = useMemo(() => {
        if (!searchQuery.trim()) return questions;
        const q = searchQuery.toLowerCase();
        return questions.filter(
            (item) =>
                item.question.toLowerCase().includes(q) ||
                item.answers.some((a) => a.answer.toLowerCase().includes(q))
        );
    }, [questions, searchQuery]);

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ── Add Question ──────────────────────────────────────────────
    const handleOpenAdd = () => {
        setNewQuestion("");
        setNewAnswers(["", ""]);
        setAddDialogOpen(true);
    };

    const handleCloseAdd = () => {
        if (isCreating) return;
        setAddDialogOpen(false);
    };

    const handleAnswerChange = (index: number, value: string) => {
        setNewAnswers((prev) => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    const handleAddAnswer = () => {
        setNewAnswers((prev) => [...prev, ""]);
    };

    const handleRemoveAnswer = (index: number) => {
        if (newAnswers.length <= 2) return; // min 2 answers
        setNewAnswers((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCreateQuestion = async () => {
        if (!newQuestion.trim()) {
            showToast("Nội dung câu hỏi không được để trống", "warning");
            return;
        }
        const filledAnswers = newAnswers.filter((a) => a.trim() !== "");
        if (filledAnswers.length < 2) {
            showToast("Phải có ít nhất 2 câu trả lời", "warning");
            return;
        }

        setIsCreating(true);
        try {
            await quizService.createQuestion({
                question: newQuestion.trim(),
                answers: filledAnswers.map((a) => ({ answer: a.trim() })),
            });
            showToast("Tạo câu hỏi thành công!", "success");
            setAddDialogOpen(false);
            fetchQuestions();
        } catch (error) {
            console.error("Error creating question:", error);
            showToast("Đã có lỗi xảy ra khi tạo câu hỏi", "error");
        } finally {
            setIsCreating(false);
        }
    };

    // ── Delete Question ───────────────────────────────────────────
    const handleOpenDelete = (item: QuizQuestion) => {
        setDeletingItem(item);
        setDeleteDialogOpen(true);
    };

    const handleCloseDelete = () => {
        if (isDeleting) return;
        setDeleteDialogOpen(false);
        setDeletingItem(null);
    };

    const handleConfirmDelete = async () => {
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
    };

    // ── Render ─────────────────────────────────────────────────────
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

                        {/* Toolbar */}
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 2,
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 3,
                            }}
                        >
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
                                        <TableCell sx={{ fontWeight: "bold", width: 110 }}>
                                            Số đáp án
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold", width: 160 }}>
                                            Ngày tạo
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold", width: 80, textAlign: "center" }}>
                                            Thao tác
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredQuestions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Không tìm thấy dữ liệu phù hợp.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredQuestions.map((item) => {
                                            const isExpanded = expandedRows.has(item.id);
                                            return (
                                                <>
                                                    <TableRow
                                                        key={item.id}
                                                        hover
                                                        sx={{ cursor: "pointer" }}
                                                        onClick={() => toggleRow(item.id)}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <IconButton size="small">
                                                                {isExpanded ? (
                                                                    <ExpandLessIcon fontSize="small" />
                                                                ) : (
                                                                    <ExpandMoreIcon fontSize="small" />
                                                                )}
                                                            </IconButton>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography fontWeight={500} sx={{ fontSize: "0.9rem" }}>
                                                                {item.question}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={`${item.answers.length} đáp án`}
                                                                size="small"
                                                                color="primary"
                                                                variant="outlined"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {dayjs(item.createdAt).format("DD/MM/YYYY HH:mm")}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                                                            <Tooltip title="Xóa câu hỏi">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleOpenDelete(item)}
                                                                    sx={{
                                                                        bgcolor: "rgba(211,47,47,0.06)",
                                                                        "&:hover": { bgcolor: "rgba(211,47,47,0.14)" },
                                                                    }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                    {/* Expandable answers row */}
                                                    <TableRow key={`${item.id}-answers`}>
                                                        <TableCell
                                                            colSpan={5}
                                                            sx={{ p: 0, border: isExpanded ? undefined : "none" }}
                                                        >
                                                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                                <Box sx={{ bgcolor: "#fafafa", px: 4, py: 2 }}>
                                                                    <Typography
                                                                        variant="subtitle2"
                                                                        fontWeight="bold"
                                                                        color="text.secondary"
                                                                        sx={{ mb: 1 }}
                                                                    >
                                                                        Danh sách đáp án:
                                                                    </Typography>
                                                                    <List dense disablePadding>
                                                                        {item.answers.map((ans, idx) => (
                                                                            <ListItem
                                                                                key={ans.id}
                                                                                disablePadding
                                                                                sx={{ py: 0.25 }}
                                                                            >
                                                                                <ListItemText
                                                                                    primary={
                                                                                        <Typography
                                                                                            variant="body2"
                                                                                            color="text.primary"
                                                                                        >
                                                                                            {idx + 1}. {ans.answer}
                                                                                        </Typography>
                                                                                    }
                                                                                />
                                                                            </ListItem>
                                                                        ))}
                                                                    </List>
                                                                </Box>
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                </>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            </Container>

            {/* ── Add Question Dialog ─────────────────────────── */}
            <Dialog
                open={addDialogOpen}
                onClose={handleCloseAdd}
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
                    <IconButton onClick={handleCloseAdd} disabled={isCreating} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, fontWeight: "bold" }}>
                        Nội dung câu hỏi *
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        variant="outlined"
                        placeholder="Nhập câu hỏi..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        disabled={isCreating}
                        sx={{ mb: 3 }}
                    />

                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">
                            Danh sách câu trả lời * (tối thiểu 2)
                        </Typography>
                        <Button
                            size="small"
                            startIcon={<AddAnswerIcon />}
                            onClick={handleAddAnswer}
                            disabled={isCreating}
                        >
                            Thêm đáp án
                        </Button>
                    </Box>

                    {newAnswers.map((ans, idx) => (
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
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                disabled={isCreating}
                            />
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveAnswer(idx)}
                                disabled={newAnswers.length <= 2 || isCreating}
                            >
                                <RemoveAnswerIcon />
                            </IconButton>
                        </Box>
                    ))}

                    {newAnswers.filter((a) => a.trim()).length < 2 && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            Cần ít nhất 2 đáp án hợp lệ
                        </Alert>
                    )}
                </DialogContent>

                <DialogActions
                    sx={{ p: 3, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
                >
                    <Button onClick={handleCloseAdd} color="inherit" disabled={isCreating} sx={{ px: 3, borderRadius: 2 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleCreateQuestion}
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

            {/* ── Delete Confirm Dialog ───────────────────────── */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleCloseDelete}
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
                    {deletingItem && (
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography variant="body1" fontWeight={500}>
                                {deletingItem.question}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {deletingItem.answers.length} câu trả lời
                            </Typography>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2.5, pt: 0 }}>
                    <Button onClick={handleCloseDelete} color="inherit" disabled={isDeleting} sx={{ borderRadius: 2 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
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
        </AdminLayout>
    );
}
