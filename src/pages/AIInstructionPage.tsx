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
    TableSortLabel,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Paper,
} from "@mui/material";
import { Search as SearchIcon, SmartToy as BotIcon, Edit as EditIcon, Close as CloseIcon, Save as SaveIcon } from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import { aiInstructionService } from "@/services/ai/aiInstructionService";
import type { AiInstruction } from "@/types/aiInstruction";
import { AdminLayout } from "@/layouts/AdminLayout";
import dayjs from "dayjs";

type Order = "asc" | "desc";

export default function AIInstructionPage() {
    const [instructions, setInstructions] = useState<AiInstruction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [order, setOrder] = useState<Order>("desc");
    const [orderBy, setOrderBy] = useState<keyof AiInstruction>("updatedAt");

    // Edit state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AiInstruction | null>(null);
    const [editContent, setEditContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const { showToast } = useToast();

    useEffect(() => {
        fetchInstructions();
    }, []);

    const fetchInstructions = async () => {
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
    };

    const handleRequestSort = (property: keyof AiInstruction) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const handleOpenEdit = (item: AiInstruction) => {
        setEditingItem(item);
        setEditContent(item.instruction);
        setEditDialogOpen(true);
    };

    const handleCloseEdit = () => {
        setEditDialogOpen(false);
        setTimeout(() => {
            setEditingItem(null);
            setEditContent("");
        }, 200);
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        if (!editContent.trim()) {
            showToast("Nội dung chỉ thị không được để trống", "warning");
            return;
        }

        setIsSaving(true);
        try {
            await aiInstructionService.updateInstruction(
                editingItem.id,
                editContent,
                editingItem.instructionType
            );
            showToast("Cập nhật chỉ thị thành công", "success");

            // Update local state without refetching fully
            setInstructions(prev =>
                prev.map(i => i.id === editingItem.id ? {
                    ...i,
                    instruction: editContent,
                    updatedAt: new Date().toISOString()
                } : i)
            );
            handleCloseEdit();
        } catch (error) {
            console.error("Lỗi khi cập nhật chỉ thị:", error);
            showToast("Đã có lỗi xảy ra khi cập nhật chỉ thị", "error");
        } finally {
            setIsSaving(false);
        }
    };

    // Filter and sort the data locally
    const filteredAndSortedInstructions = useMemo(() => {
        // Filter
        let data = instructions;
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            data = data.filter(
                (item) =>
                    item.instruction.toLowerCase().includes(query) ||
                    item.instructionType.toLowerCase().includes(query)
            );
        }

        // Sort
        data = [...data].sort((a, b) => {
            let valA = a[orderBy];
            let valB = b[orderBy];

            // Handle date strings
            if (orderBy === "createdAt" || orderBy === "updatedAt") {
                valA = new Date(valA).getTime() as any;
                valB = new Date(valB).getTime() as any;
            } else if (typeof valA === "string" && typeof valB === "string") {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return order === "asc" ? -1 : 1;
            if (valA > valB) return order === "asc" ? 1 : -1;
            return 0;
        });

        return data;
    }, [instructions, searchQuery, order, orderBy]);

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
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                            <BotIcon color="primary" sx={{ fontSize: 28 }} />
                            <Typography variant="h5" fontWeight="bold">
                                Cấu hình AI (Instructions)
                            </Typography>
                        </Box>

                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                            <TextField
                                placeholder="Tìm kiếm nội dung hoặc loại prompt..."
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
                                Tổng số: <strong>{filteredAndSortedInstructions.length}</strong> chỉ thị
                            </Typography>
                        </Box>

                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: "#f8f9fa" }}>
                                    <TableRow>
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
                                                <Typography variant="body2" color="text.secondary">Không tìm thấy dữ liệu phù hợp.</Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAndSortedInstructions.map((item) => (
                                            <TableRow key={item.id} hover>
                                                <TableCell>
                                                    <Chip
                                                        label={item.instructionType}
                                                        color="primary"
                                                        variant="outlined"
                                                        size="small"
                                                        sx={{ fontWeight: 600, bgcolor: "rgba(25, 118, 210, 0.04)" }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box
                                                        sx={{
                                                            maxHeight: 120,
                                                            overflowY: "auto",
                                                            pr: 1,
                                                            color: "text.secondary",
                                                            fontSize: "0.875rem",
                                                            whiteSpace: "pre-wrap",
                                                            "&::-webkit-scrollbar": { width: 4 },
                                                            "&::-webkit-scrollbar-thumb": { bgcolor: "#ddd", borderRadius: 2 },
                                                        }}
                                                    >
                                                        {item.instruction}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                                                        {dayjs(item.updatedAt).format("DD/MM/YYYY HH:mm")}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={() => handleOpenEdit(item)}
                                                        sx={{ bgcolor: 'rgba(25, 118, 210, 0.08)', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.15)' } }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Paper>
            </Container>

            {/* Edit Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={!isSaving ? handleCloseEdit : undefined}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, maxHeight: '90vh' }
                }}
            >
                <DialogTitle sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 2
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <BotIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                            Cập nhật chỉ thị
                        </Typography>
                        {editingItem && (
                            <Chip
                                label={editingItem.instructionType}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ ml: 1, fontWeight: 'bold' }}
                            />
                        )}
                    </Box>
                    <IconButton onClick={handleCloseEdit} disabled={isSaving} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 4, bgcolor: '#f8f9fa' }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ m: 1, fontWeight: 'bold' }}>
                        Nội dung chỉ thị (Markdown / Text)
                    </Typography>
                    <Box
                        sx={{
                            position: 'relative',
                            borderRadius: 2,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'grey.300',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                            bgcolor: '#1e1e1e' // Dark theme editor
                        }}
                    >
                        <TextField
                            multiline
                            fullWidth
                            minRows={18}
                            maxRows={24}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            disabled={isSaving}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    fontFamily: '"Fira Code", "Consolas", monospace',
                                    color: '#d4d4d4',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.6,
                                    p: 3,
                                    '& fieldset': { border: 'none' },
                                },
                            }}
                            placeholder="Nhập nội dung chỉ thị tại đây..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Button
                        onClick={handleCloseEdit}
                        color="inherit"
                        disabled={isSaving}
                        sx={{ px: 3, py: 1, borderRadius: 2 }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSaveEdit}
                        variant="contained"
                        color="primary"
                        disabled={isSaving || !editContent.trim()}
                        startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{ px: 4, py: 1, borderRadius: 2, fontWeight: 'bold' }}
                    >
                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogActions>
            </Dialog>
        </AdminLayout>
    );
}
