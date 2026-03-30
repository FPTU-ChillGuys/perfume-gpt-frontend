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
    Quiz as SurveyIcon,
    Search as SearchIcon,
} from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import { surveyService } from "@/services/ai/surveyService";
import type { SurveyQuestion, SurveyQuestionRequest } from "@/types/survey";
import { AdminLayout } from "@/layouts/AdminLayout";
import SurveyQuestionRow from "@/components/survey/admin/SurveyQuestionRow";
import SurveyAddDialog from "@/components/survey/admin/SurveyAddDialog";
import SurveyEditDialog from "@/components/survey/admin/SurveyEditDialog";
import SurveyDeleteDialog from "@/components/survey/admin/SurveyDeleteDialog";

export default function SurveyManagementPage() {
    const { showToast } = useToast();

    // ── List state ────────────────────────────────────────────────
    const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // ── Dialog open/loading state only (form state lives in dialogs) ─
    const [addOpen, setAddOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<SurveyQuestion | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState<SurveyQuestion | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── Data fetching ─────────────────────────────────────────────
    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await surveyService.getQuestions();
            setQuestions(response.data.reverse());
        } catch (error) {
            console.error("Failed to fetch survey questions:", error);
            showToast("Lỗi khi tải danh sách câu hỏi Survey", "error");
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
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // ── Add ───────────────────────────────────────────────────────
    const handleCreate = useCallback(async (payloadArray: SurveyQuestionRequest[]) => {
        // Validation is now primarily handled inside the dialog via isInvalid,
        // but we can double check
        for (const payload of payloadArray) {
            if (!payload.question) {
                showToast("Nội dung câu hỏi không được để trống", "warning");
                return;
            }
            if ((payload.answers?.length ?? 0) < 2) {
                showToast("Phải có ít nhất 2 câu trả lời cho mỗi câu hỏi", "warning");
                return;
            }
        }
        setIsCreating(true);
        try {
            await surveyService.createQuestions(payloadArray);
            showToast(`Tạo thành công ${payloadArray.length} câu hỏi!`, "success");
            setAddOpen(false);
            fetchQuestions();
        } catch (error) {
            console.error("Error creating questions:", error);
            showToast("Đã có lỗi xảy ra khi tạo danh sách câu hỏi", "error");
        } finally {
            setIsCreating(false);
        }
    }, [showToast, fetchQuestions]);

    // ── Edit ──────────────────────────────────────────────────────
    const handleOpenEdit = useCallback((item: SurveyQuestion) => {
        setEditingItem(item);
        setEditOpen(true);
    }, []);

    const handleCloseEdit = useCallback(() => {
        if (!isSaving) {
            setEditOpen(false);
            setEditingItem(null);
        }
    }, [isSaving]);

    const handleSaveEdit = useCallback(async (payload: { question: string; questionType: any; answers: { answer: string }[] }) => {
        if (!editingItem) return;
        if (!payload.question) {
            showToast("Nội dung câu hỏi không được để trống", "warning");
            return;
        }
        if (payload.answers.length < 2) {
            showToast("Phải có ít nhất 2 câu trả lời", "warning");
            return;
        }
        setIsSaving(true);
        try {
            await surveyService.updateQuestion(editingItem.id, payload);
            showToast("Cập nhật câu hỏi thành công!", "success");
            fetchQuestions();
            handleCloseEdit();
        } catch (error) {
            console.error("Error updating question:", error);
            showToast("Đã có lỗi xảy ra khi cập nhật câu hỏi", "error");
        } finally {
            setIsSaving(false);
        }
    }, [editingItem, showToast, fetchQuestions, handleCloseEdit]);

    // ── Delete ────────────────────────────────────────────────────
    const handleOpenDelete = useCallback((item: SurveyQuestion) => {
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
            await surveyService.deleteQuestion(deletingItem.id);
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
                            <SurveyIcon color="primary" sx={{ fontSize: 28 }} />
                            <Typography variant="h5" fontWeight="bold" sx={{ flexGrow: 1 }}>
                                Quản lý Survey
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => setAddOpen(true)}
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
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "grey.50" }}>
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
                                            <SurveyQuestionRow
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

            <SurveyAddDialog
                open={addOpen}
                isCreating={isCreating}
                onClose={() => setAddOpen(false)}
                onSubmit={handleCreate}
            />

            <SurveyEditDialog
                open={editOpen}
                isSaving={isSaving}
                initialData={editingItem}
                onClose={handleCloseEdit}
                onSubmit={handleSaveEdit}
            />

            <SurveyDeleteDialog
                open={deleteOpen}
                item={deletingItem}
                isDeleting={isDeleting}
                onClose={handleCloseDelete}
                onConfirm={handleConfirmDelete}
            />
        </AdminLayout>
    );
}
