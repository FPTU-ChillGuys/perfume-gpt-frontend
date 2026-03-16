import { useState, useEffect, useMemo } from "react";
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
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
import type { UserLog, UserLogSummaryResponse } from "@/types/log";
import { getUserLogEventTypeLabel } from "@/utils/userLogLabels";

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const UserLogsManagementPage = () => {
    const { showToast } = useToast();
    const [tabValue, setTabValue] = useState(0);

    const [logs, setLogs] = useState<UserLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [summaries, setSummaries] = useState<UserLogSummaryResponse[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(true);

    // Pagination states
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [summaryPage, setSummaryPage] = useState(0);
    const [summaryRowsPerPage, setSummaryRowsPerPage] = useState(10);

    // Filtering states
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Details Modal State
    const [selectedLog, setSelectedLog] = useState<UserLog | null>(null);
    const [selectedSummary, setSelectedSummary] = useState<UserLogSummaryResponse | null>(null);

    useEffect(() => {
        loadLogs();
        loadSummaries();
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

    const loadSummaries = async () => {
        try {
            setSummaryLoading(true);
            const data = await logService.getAllUserLogsSummaries();
            setSummaries(data || []);
        } catch (error) {
            console.error("Failed to load user log summaries:", error);
            showToast("Không thể tải danh sách tóm tắt log người dùng.", "error");
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleSearch = () => {
        setSearchTerm(searchInput);
        setPage(0);
        setSummaryPage(0);
    };

    const handleClearFilters = () => {
        setSearchInput("");
        setSearchTerm("");
        setFromDate("");
        setToDate("");
        setPage(0);
        setSummaryPage(0);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleChangeSummaryPage = (_event: unknown, newPage: number) => {
        setSummaryPage(newPage);
    };

    const handleChangeSummaryRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSummaryRowsPerPage(parseInt(event.target.value, 10));
        setSummaryPage(0);
    };

    const handleViewDetail = (log: UserLog) => {
        setSelectedLog(log);
    };

    const handleCloseDetail = () => {
        setSelectedLog(null);
    };

    const handleViewSummaryDetail = (summary: UserLogSummaryResponse) => {
        setSelectedSummary(summary);
    };

    const handleCloseSummaryDetail = () => {
        setSelectedSummary(null);
    };

    // Client-side filtering
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            let matchesSearch = true;
            if (searchTerm) {
                // Support searching by ids, event type, content, and metadata payload.
                const idMatches = log.userId?.toLowerCase().includes(searchTerm.toLowerCase());
                const logIdMatches = log.id?.toLowerCase().includes(searchTerm.toLowerCase());
                const eventTypeMatches = log.eventType?.toLowerCase().includes(searchTerm.toLowerCase());
                const contentMatches = log.contentText?.toLowerCase().includes(searchTerm.toLowerCase());
                const metadataMatches = JSON.stringify(log.metadata || {})
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
                matchesSearch = !!(idMatches || logIdMatches || eventTypeMatches || contentMatches || metadataMatches);
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

    const filteredSummaries = useMemo(() => {
        return summaries.filter((summary) => {
            let matchesSearch = true;
            if (searchTerm) {
                const normalizedSearch = searchTerm.toLowerCase();
                const userIdMatches = summary.userId?.toLowerCase().includes(normalizedSearch);
                const idMatches = summary.id?.toLowerCase().includes(normalizedSearch);
                const logSummaryMatches = summary.logSummary?.toLowerCase().includes(normalizedSearch);
                const featureSnapshotMatches = JSON.stringify(summary.featureSnapshot || {})
                    .toLowerCase()
                    .includes(normalizedSearch);
                matchesSearch = !!(userIdMatches || idMatches || logSummaryMatches || featureSnapshotMatches);
            }

            let matchesFromDate = true;
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                fromDateObj.setHours(0, 0, 0, 0);
                const summaryDateObj = new Date(summary.createdAt);
                matchesFromDate = summaryDateObj >= fromDateObj;
            }

            let matchesToDate = true;
            if (toDate) {
                const toDateObj = new Date(toDate);
                toDateObj.setHours(23, 59, 59, 999);
                const summaryDateObj = new Date(summary.createdAt);
                matchesToDate = summaryDateObj <= toDateObj;
            }

            return matchesSearch && matchesFromDate && matchesToDate;
        });
    }, [summaries, searchTerm, fromDate, toDate]);

    const paginatedSummaries = useMemo(() => {
        const startIdx = summaryPage * summaryRowsPerPage;
        return filteredSummaries.slice(startIdx, startIdx + summaryRowsPerPage);
    }, [filteredSummaries, summaryPage, summaryRowsPerPage]);

    return (
        <AdminLayout>
            <Box>
                <Typography variant="h4" fontWeight="bold" mb={3}>
                    Quản lý Log Người Dùng
                </Typography>

                <Paper sx={{ mb: 3 }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="user logs tabs">
                        <Tab label="Log hoạt động" id="user-log-tab-0" aria-controls="user-log-panel-0" />
                        <Tab label="User log summary" id="user-log-tab-1" aria-controls="user-log-panel-1" />
                    </Tabs>
                </Paper>

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
                            label={tabValue === 0 ? "Tìm kiếm Log ID / User ID" : "Tìm kiếm Summary ID / User ID"}
                            placeholder={tabValue === 0 ? "Nhập ID..." : "Nhập ID hoặc nội dung tóm tắt..."}
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

                {tabValue === 0 && (
                    <TableContainer component={Paper} id="user-log-panel-0" aria-labelledby="user-log-tab-0">
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "grey.50" }}>
                                    <TableCell>Log ID</TableCell>
                                    <TableCell>User ID</TableCell>
                                    <TableCell align="center">Loai su kien</TableCell>
                                    <TableCell align="center">Entity</TableCell>
                                    <TableCell>Noi dung</TableCell>
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
                                                {getUserLogEventTypeLabel(log.eventType)}
                                            </TableCell>
                                            <TableCell align="center">
                                                {log.entityType || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap>
                                                    {log.contentText || "-"}
                                                </Typography>
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
                )}

                {tabValue === 1 && (
                    <TableContainer component={Paper} id="user-log-panel-1" aria-labelledby="user-log-tab-1">
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: "grey.50" }}>
                                    <TableCell>Summary ID</TableCell>
                                    <TableCell>User ID</TableCell>
                                    <TableCell align="right">Tổng event</TableCell>
                                    <TableCell>Nội dung tóm tắt</TableCell>
                                    <TableCell>Ngày tạo</TableCell>
                                    <TableCell>Cập nhật cuối</TableCell>
                                    <TableCell align="center">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summaryLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedSummaries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Không có bản tóm tắt nào phù hợp
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSummaries.map((summary) => (
                                        <TableRow key={summary.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>
                                                    {summary.id?.substring(0, 8)}...
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {summary.userId ? `${summary.userId.substring(0, 8)}...` : "N/A"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {summary.totalEvents ?? 0}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{ maxWidth: 520 }}
                                                >
                                                    {summary.logSummary || "-"}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap>
                                                    {formatDate(summary.createdAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap>
                                                    {formatDate(summary.updatedAt)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Xem chi tiết summary">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewSummaryDetail(summary)}
                                                        color="primary"
                                                    >
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {!summaryLoading && (
                            <TablePagination
                                component="div"
                                count={filteredSummaries.length}
                                page={summaryPage}
                                onPageChange={handleChangeSummaryPage}
                                rowsPerPage={summaryRowsPerPage}
                                onRowsPerPageChange={handleChangeSummaryRowsPerPage}
                                rowsPerPageOptions={[5, 10, 25, 50, 100]}
                                labelRowsPerPage="Số summary mỗi trang:"
                                labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
                            />
                        )}
                    </TableContainer>
                )}
            </Box>

            <LogDetailModal
                open={!!selectedLog}
                onClose={handleCloseDetail}
                selectedLog={selectedLog}
            />

            <Dialog
                open={!!selectedSummary}
                onClose={handleCloseSummaryDetail}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: "bold" }}>
                    Chi tiết User Log Summary
                </DialogTitle>
                <DialogContent dividers>
                    {selectedSummary && (
                        <>
                            <Typography variant="subtitle2" gutterBottom>
                                <strong>Summary ID:</strong> {selectedSummary.id}
                            </Typography>
                            <Typography variant="subtitle2" gutterBottom>
                                <strong>User ID:</strong> {selectedSummary.userId || "N/A"}
                            </Typography>
                            <Typography variant="subtitle2" gutterBottom>
                                <strong>Tổng event:</strong> {selectedSummary.totalEvents ?? 0}
                            </Typography>
                            <Typography variant="subtitle2" gutterBottom>
                                <strong>Ngày tạo:</strong> {formatDate(selectedSummary.createdAt)}
                            </Typography>
                            <Typography variant="subtitle2" gutterBottom>
                                <strong>Cập nhật cuối:</strong> {formatDate(selectedSummary.updatedAt)}
                            </Typography>

                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                                Nội dung tóm tắt
                            </Typography>
                            <Box
                                sx={{
                                    bgcolor: "grey.50",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    p: 2,
                                }}
                            >
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                    {selectedSummary.logSummary || "-"}
                                </Typography>
                            </Box>

                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                                Feature Snapshot
                            </Typography>
                            <Box
                                component="pre"
                                sx={{
                                    bgcolor: "grey.100",
                                    p: 2,
                                    borderRadius: 1,
                                    overflowX: "auto",
                                    maxHeight: 320,
                                    fontSize: "0.875rem",
                                }}
                            >
                                {JSON.stringify(selectedSummary.featureSnapshot || {}, null, 2)}
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSummaryDetail} variant="contained">
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </AdminLayout>
    );
};
