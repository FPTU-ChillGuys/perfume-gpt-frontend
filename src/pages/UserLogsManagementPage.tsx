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
import { LogDetailModal } from "@/components/log/LogDetailModal";
import { logService } from "@/services/ai/logService";
import { useToast } from "@/hooks/useToast";
import type { UserLog } from "@/types/log";

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const UserLogsManagementPage = () => {
    const { showToast } = useToast();
    const [logs, setLogs] = useState<UserLog[]>([]);
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
    const [selectedLog, setSelectedLog] = useState<UserLog | null>(null);

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await logService.getAllUserLogs();
            // Safeguard against API returning null or undefined data
            setLogs(data || []);
        } catch (error) {
            console.error("Failed to load user logs:", error);
            showToast("Không thể tải danh sách log người dùng.", "error");
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

    const handleViewDetail = (log: UserLog) => {
        setSelectedLog(log);
    };

    const handleCloseDetail = () => {
        setSelectedLog(null);
    };

    // Client-side filtering
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            let matchesSearch = true;
            if (searchTerm) {
                // We only really have userId to search by since they are logs
                const idMatches = log.userId?.toLowerCase().includes(searchTerm.toLowerCase());
                const logIdMatches = log.id?.toLowerCase().includes(searchTerm.toLowerCase());
                matchesSearch = !!(idMatches || logIdMatches);
            }

            let matchesFromDate = true;
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                // Set to start of day
                fromDateObj.setHours(0, 0, 0, 0);
                const logDateObj = new Date(log.createdAt);
                matchesFromDate = logDateObj >= fromDateObj;
            }

            let matchesToDate = true;
            if (toDate) {
                const toDateObj = new Date(toDate);
                // Set to end of day
                toDateObj.setHours(23, 59, 59, 999);
                const logDateObj = new Date(log.createdAt);
                matchesToDate = logDateObj <= toDateObj;
            }

            return matchesSearch && matchesFromDate && matchesToDate;
        });
    }, [logs, searchTerm, fromDate, toDate]);

    // Client-side pagination
    const paginatedLogs = useMemo(() => {
        const startIdx = page * rowsPerPage;
        return filteredLogs.slice(startIdx, startIdx + rowsPerPage);
    }, [filteredLogs, page, rowsPerPage]);

    return (
        <AdminLayout>
            <Box>
                <Typography variant="h4" fontWeight="bold" mb={3}>
                    Quản lý Log Người Dùng
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
                            label="Tìm kiếm Log ID / User ID"
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
                                <TableCell>Log ID</TableCell>
                                <TableCell>User ID</TableCell>
                                <TableCell align="center">Message Logs</TableCell>
                                <TableCell align="center">Quiz Logs</TableCell>
                                <TableCell align="center">Search Logs</TableCell>
                                <TableCell>Ngày tạo log</TableCell>
                                <TableCell>Cập nhật cuối</TableCell>
                                <TableCell align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : paginatedLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Không có log nào phù hợp
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <TableRow key={log.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={500}>
                                                {log.id?.substring(0, 8)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color={log.userId ? "textPrimary" : "textSecondary"}>
                                                {log.userId ? `${log.userId.substring(0, 8)}...` : "Khách"}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {log.userMessageLogs?.length || 0}
                                        </TableCell>
                                        <TableCell align="center">
                                            {log.userQuizLogs?.length || 0}
                                        </TableCell>
                                        <TableCell align="center">
                                            {log.userSearchLogs?.length || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap>
                                                {formatDate(log.createdAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" noWrap>
                                                {formatDate(log.updatedAt)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Xem chi tiết">
                                                <IconButton size="small" onClick={() => handleViewDetail(log)} color="primary">
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
                            count={filteredLogs.length}
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

            <LogDetailModal
                open={!!selectedLog}
                onClose={handleCloseDetail}
                selectedLog={selectedLog}
            />
        </AdminLayout>
    );
};
