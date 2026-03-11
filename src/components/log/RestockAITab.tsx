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
    Button,
} from "@mui/material";
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Visibility as VisibilityIcon,
    AutoGraph as AutoGraphIcon,
} from "@mui/icons-material";
import { inventoryService } from "@/services/ai/inventoryService";
import { useToast } from "@/hooks/useToast";
import type { RestockLog, RestockAIVariant, RestockAIPredictionData } from "@/types/inventory";
import { RestockDetailDialog } from "@/components/log/RestockDetailDialog";

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const RestockAITab = () => {
    const { showToast } = useToast();
    const [logs, setLogs] = useState<RestockLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [predictionLoading, setPredictionLoading] = useState(false);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Detail dialog
    const [selectedVariants, setSelectedVariants] = useState<RestockAIVariant[] | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogTitle, setDialogTitle] = useState("");

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const response = await inventoryService.getRestockLogsPaged();
            setLogs(response.data?.items ?? []);
        } catch (error) {
            console.error("Failed to load inventory restock logs:", error);
            showToast("Không thể tải danh sách log dự đoán nhập hàng.", "error");
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

    const handleViewLog = (log: RestockLog) => {
        try {
            // Log.data contains JSON string
            const parsedData = JSON.parse(log.inventoryLog) as RestockAIPredictionData;
            setSelectedVariants(parsedData.variants || []);
            setDialogTitle(`Chi tiết log nhập hàng: ${log.id?.substring(0, 8)}`);
            setDialogOpen(true);
        } catch (error) {
            console.error("Failed to parse restock log data", error);
            showToast("Dữ liệu log không đúng hệ dạng JSON hợp lệ hoặc là log thông báo lỗi.", "warning");
        }
    };

    const handleGeneratePrediction = async () => {
        try {
            setPredictionLoading(true);
            const response = await inventoryService.getRestockAIPrediction();

            // The AI returns a JSON string inside data
            const jsonString = response.data;
            if (jsonString) {
                const parsedData = JSON.parse(jsonString) as RestockAIPredictionData;
                setSelectedVariants(parsedData.variants || []);
                setDialogTitle("Kết quả Dự đoán Nhập hàng mới nhất");
                setDialogOpen(true);
                // Reload logs to get the newly generated one
                loadLogs();
            } else {
                showToast("Không nhận được dữ liệu dự đoán hợp lệ.", "warning");
            }

        } catch (error) {
            console.error("Failed to generate restock prediction:", error);
            showToast("Sinh dự đoán thất bại. Vui lòng thử lại sau.", "error");
        } finally {
            setPredictionLoading(false);
        }
    };

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            let matchesSearch = true;
            if (searchTerm) {
                matchesSearch = log.id?.toLowerCase().includes(searchTerm.toLowerCase());
            }

            let matchesFromDate = true;
            if (fromDate) {
                const from = new Date(fromDate);
                from.setHours(0, 0, 0, 0);
                matchesFromDate = new Date(log.createdAt) >= from;
            }

            let matchesToDate = true;
            if (toDate) {
                const to = new Date(toDate);
                to.setHours(23, 59, 59, 999);
                matchesToDate = new Date(log.createdAt) <= to;
            }

            return matchesSearch && matchesFromDate && matchesToDate;
        });
    }, [logs, searchTerm, fromDate, toDate]);

    const paginatedLogs = useMemo(() => {
        const start = page * rowsPerPage;
        return filteredLogs.slice(start, start + rowsPerPage);
    }, [filteredLogs, page, rowsPerPage]);

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h5" fontWeight="bold" color="primary.dark">
                    Lịch sử Phân tích Nhập hàng
                </Typography>
                <Tooltip title="Dự đoán nhu cầu nhập hàng trong thời gian tới dựa trên xu hướng bằng AI">
                    <Button
                        variant="contained"
                        startIcon={predictionLoading ? <CircularProgress size={20} color="inherit" /> : <AutoGraphIcon />}
                        onClick={handleGeneratePrediction}
                        disabled={predictionLoading}
                    >
                        {predictionLoading ? "Đang phân tích..." : "Dự đoán nhập kho (AI)"}
                    </Button>
                </Tooltip>
            </Box>

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
                        label="Tìm kiếm Log ID"
                        placeholder="Nhập ID..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
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

                    <Tooltip title="Xóa bộ lọc">
                        <IconButton
                            onClick={handleClearFilters}
                            sx={{ height: 56, borderRadius: 1, border: "1px solid", borderColor: "divider" }}
                        >
                            <ClearIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: "grey.50" }}>
                            <TableCell>Log ID</TableCell>
                            <TableCell>Nội dung (rút gọn)</TableCell>
                            <TableCell>Ngày tạo</TableCell>
                            <TableCell>Cập nhật cuối</TableCell>
                            <TableCell align="center">Thao tác</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : paginatedLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
                                    <TableCell sx={{ maxWidth: 320 }}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                                maxWidth: 300,
                                            }}
                                            title={log.inventoryLog}
                                        >
                                            {log.inventoryLog
                                                ? log.inventoryLog.substring(0, 80) + (log.inventoryLog.length > 80 ? "..." : "")
                                                : "Không có nội dung"}
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
                                        <Tooltip title="Xem chi tiết dự đoán">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewLog(log)}
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

                {!loading && (
                    <TablePagination
                        component="div"
                        count={filteredLogs.length}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage="Số log mỗi trang:"
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} của ${count}`}
                    />
                )}
            </TableContainer>

            <RestockDetailDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                data={selectedVariants}
                title={dialogTitle}
            />
        </Box>
    );
};
