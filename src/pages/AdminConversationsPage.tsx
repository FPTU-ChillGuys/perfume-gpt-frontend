import { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    TextField,
    CircularProgress,
    IconButton,
    Tooltip,
} from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { conversationService } from "@/services/ai/conversationService";
import { useToast } from "@/hooks/useToast";
import type { AdminConversation } from "@/types/conversation";
import { ConversationDetailModal } from "@/components/log/ConversationDetailModal";

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const AdminConversationsPage = () => {
    const { showToast } = useToast();
    const [conversations, setConversations] = useState<AdminConversation[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination states
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filtering states
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Details Modal State
    const [selectedConversation, setSelectedConversation] = useState<AdminConversation | null>(null);

    useEffect(() => {
        loadConversations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const response = await conversationService.getAllConversations();
            setConversations(response.data || []);
        } catch (error) {
            console.error("Failed to load user conversations:", error);
            showToast("Không thể tải danh sách hội thoại.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setSearchTerm(searchInput);
        setPage(0);
    };

    const handleClearFilters = () => {
        setSearchInput("");
        setSearchTerm("");
        setFromDate("");
        setToDate("");
        setPage(0);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleViewDetail = (conv: AdminConversation) => {
        setSelectedConversation(conv);
    };

    const handleCloseDetail = () => {
        setSelectedConversation(null);
    };

    // Client-side filtering
    const filteredConversations = useMemo(() => {
        return conversations.filter((conv) => {
            let matchesSearch = true;
            if (searchTerm) {
                const idMatches = conv.userId?.toLowerCase().includes(searchTerm.toLowerCase());
                const logIdMatches = conv.id?.toLowerCase().includes(searchTerm.toLowerCase());
                matchesSearch = !!(idMatches || logIdMatches);
            }

            let matchesFromDate = true;
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                fromDateObj.setHours(0, 0, 0, 0);
                const logDateObj = new Date(conv.createdAt);
                matchesFromDate = logDateObj >= fromDateObj;
            }

            let matchesToDate = true;
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setHours(23, 59, 59, 999);
                const logDateObj = new Date(conv.createdAt);
                matchesToDate = logDateObj <= toDateObj;
            }

            return matchesSearch && matchesFromDate && matchesToDate;
        });
    }, [conversations, searchTerm, fromDate, toDate]);

    // Client-side pagination
    const paginatedConversations = useMemo(() => {
        const startIdx = page * rowsPerPage;
        return filteredConversations.slice(startIdx, startIdx + rowsPerPage);
    }, [filteredConversations, page, rowsPerPage]);

    return (
        <AdminLayout>
            <Box>
                <Typography variant="h4" fontWeight="bold" mb={3}>
                    Quản lý Hội thoại
                </Typography>

                {/* Filters */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "repeat(2, 1fr)",
                                md: "repeat(4, 1fr)",
                            },
                            gap: 2,
                        }}
                    >
                        <TextField
                            fullWidth
                            label="Tìm kiếm Conv ID / User ID"
                            placeholder="Nhập ID..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") handleSearch();
                            }}
                            InputProps={{
                                endAdornment: (
                                    <IconButton onClick={handleSearch} edge="end">
                                        <SearchIcon />
                                    </IconButton>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Từ ngày"
                            type="date"
                            value={fromDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setPage(0);
                            }}
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            fullWidth
                            label="Đến ngày"
                            type="date"
                            value={toDate}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setPage(0);
                            }}
                            InputLabelProps={{ shrink: true }}
                        />

                        <IconButton
                            onClick={handleClearFilters}
                            sx={{ height: 56, borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                        >
                            <Tooltip title="Xóa bộ lọc">
                                <ClearIcon />
                            </Tooltip>
                        </IconButton>
                    </Box>
                </Paper>

                {/* Table */}
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "grey.50" }}>
                                <TableCell>Conversation ID</TableCell>
                                <TableCell>User ID</TableCell>
                                <TableCell align="center">Tổng số tin nhắn</TableCell>
                                <TableCell>Ngày tạo</TableCell>
                                <TableCell>Cập nhật cuối</TableCell>
                                <TableCell align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedConversations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Không có hội thoại nào phù hợp
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedConversations.map((conv) => (
                                    <TableRow key={conv.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {conv.id?.substring(0, 8)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color={conv.userId ? "textPrimary" : "textSecondary"}>
                                                {conv.userId ? `${conv.userId.substring(0, 8)}...` : "Khách"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {conv.messages?.length || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap>
                                                {formatDate(conv.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap>
                                                {formatDate(conv.updatedAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Xem chi tiết">
                                                <IconButton size="small" onClick={() => handleViewDetail(conv)} color="primary">
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {!loading && (
                        <TablePagination
                            component="div"
                            count={filteredConversations.length}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25, 50, 100]}
                            labelRowsPerPage="Số log mỗi trang:"
                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
                        />
                    )}
                </TableContainer>
            </Box>

            {/* Detail Dialog Component */}
            <ConversationDetailModal
                open={!!selectedConversation}
                onClose={handleCloseDetail}
                selectedConversation={selectedConversation}
            />
        </AdminLayout>
    );
};
