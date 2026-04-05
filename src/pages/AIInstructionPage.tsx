import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Box,
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
    TableSortLabel,
    TextField,
    Typography,
} from "@mui/material";
import { Search as SearchIcon, SmartToy as BotIcon } from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import { aiInstructionService } from "@/services/ai/aiInstructionService";
import type { AiInstruction } from "@/types/aiInstruction";
import { AdminLayout } from "@/layouts/AdminLayout";
import AIInstructionRow from "@/components/ai/AIInstructionRow";
import AIInstructionEditDialog from "@/components/ai/AIInstructionEditDialog";

type Order = "asc" | "desc";

export default function AIInstructionPage() {
    const { showToast } = useToast();

    const [instructions, setInstructions] = useState<AiInstruction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [order, setOrder] = useState<Order>("desc");
    const [orderBy, setOrderBy] = useState<keyof AiInstruction>("updatedAt");

    // Edit dialog — only open/loading state here. Form state lives in the dialog.
    const [editOpen, setEditOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AiInstruction | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // ── Data fetching ─────────────────────────────────────────────
    const fetchInstructions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await aiInstructionService.getInstructions();
            setInstructions(response.data);
        } catch (error) {
            console.error("Failed to fetch instructions:", error);
            showToast("Lỗi khi tải danh sách AI Instructions", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchInstructions();
    }, [fetchInstructions]);

    // ── Sort ──────────────────────────────────────────────────────
    const handleRequestSort = useCallback((property: keyof AiInstruction) => {
        setOrder((prev) => (orderBy === property && prev === "asc" ? "desc" : "asc"));
        setOrderBy(property);
    }, [orderBy]);

    // ── Filter + sort ─────────────────────────────────────────────
    const filteredAndSortedInstructions = useMemo(() => {
        let data = instructions;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter(
                (item) =>
                    item.instruction.toLowerCase().includes(q) ||
                    item.instructionType.toLowerCase().includes(q)
            );
        }

        return [...data].sort((a, b) => {
            let valA: any = a[orderBy];
            let valB: any = b[orderBy];

            if (orderBy === "createdAt" || orderBy === "updatedAt") {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            } else if (typeof valA === "string" && typeof valB === "string") {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return order === "asc" ? -1 : 1;
            if (valA > valB) return order === "asc" ? 1 : -1;
            return 0;
        });
    }, [instructions, searchQuery, order, orderBy]);

    // ── Edit handlers ─────────────────────────────────────────────
    const handleOpenEdit = useCallback((item: AiInstruction) => {
        setEditingItem(item);
        setEditOpen(true);
    }, []);

    const handleCloseEdit = useCallback(() => {
        if (isSaving) return;
        setEditOpen(false);
        setTimeout(() => setEditingItem(null), 200);
    }, [isSaving]);

    const handleSaveEdit = useCallback(async (content: string) => {
        if (!editingItem) return;
        if (!content.trim()) {
            showToast("Nội dung chỉ thị không được để trống", "warning");
            return;
        }
        setIsSaving(true);
        try {
            await aiInstructionService.updateInstruction(
                editingItem.id,
                content,
                editingItem.instructionType
            );
            showToast("Cập nhật chỉ thị thành công", "success");
            setInstructions((prev) =>
                prev.map((i) =>
                    i.id === editingItem.id
                        ? { ...i, instruction: content, updatedAt: new Date().toISOString() }
                        : i
                )
            );
            handleCloseEdit();
        } catch (error) {
            console.error("Lỗi khi cập nhật chỉ thị:", error);
            showToast("Đã có lỗi xảy ra khi cập nhật chỉ thị", "error");
        } finally {
            setIsSaving(false);
        }
    }, [editingItem, showToast, handleCloseEdit]);

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
                            <BotIcon color="primary" sx={{ fontSize: 28 }} />
                            <Typography variant="h5" fontWeight="bold">
                                Cấu hình AI (Instructions)
                            </Typography>
                        </Box>

                        {/* Search */}
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                            <TextField
                                placeholder="Tìm kiếm nội dung hoặc loại prompt..."
                                variant="outlined"
                                size="small"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ minWidth: { xs: "100%", sm: 400 }, bgcolor: "background.paper" }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Tổng số: <strong>{filteredAndSortedInstructions.length}</strong> chỉ thị
                            </Typography>
                        </Box>

                        {/* Table */}
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "grey.50" }}>
                                        <TableCell>
                                            <TableSortLabel
                                                active={orderBy === "instructionType"}
                                                direction={orderBy === "instructionType" ? order : "asc"}
                                                onClick={() => handleRequestSort("instructionType")}
                                                sx={{ fontWeight: "bold" }}
                                            >
                                                Loại Instruction (Type)
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell sx={{ width: "50%", fontWeight: "bold" }}>
                                            Nội dung (Instruction)
                                        </TableCell>
                                        <TableCell>
                                            <TableSortLabel
                                                active={orderBy === "updatedAt"}
                                                direction={orderBy === "updatedAt" ? order : "asc"}
                                                onClick={() => handleRequestSort("updatedAt")}
                                                sx={{ fontWeight: "bold" }}
                                            >
                                                Ngày cập nhật
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: "bold", width: 100, textAlign: "center" }}>
                                            Thao tác
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredAndSortedInstructions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Không tìm thấy dữ liệu phù hợp.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAndSortedInstructions.map((item) => (
                                            <AIInstructionRow
                                                key={item.id}
                                                item={item}
                                                onEdit={handleOpenEdit}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            </Container>

            <AIInstructionEditDialog
                open={editOpen}
                isSaving={isSaving}
                initialData={editingItem}
                onClose={handleCloseEdit}
                onSubmit={handleSaveEdit}
            />
        </AdminLayout>
    );
}
