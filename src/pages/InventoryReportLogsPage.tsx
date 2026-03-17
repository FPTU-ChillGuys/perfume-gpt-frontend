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
    Tabs,
    Tab,
} from "@mui/material";
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    Visibility as VisibilityIcon,
    AutoAwesome as AutoAwesomeIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { inventoryService } from "@/services/ai/inventoryService";
import { useToast } from "@/hooks/useToast";
import type { AIInventoryReportLog } from "@/types/inventory";
import { InventoryLogDetailDialog } from "@/components/log/InventoryLogDetailDialog";
import { AIInventoryReportDialog } from "@/components/log/AIInventoryReportDialog";
import { RestockAITab } from "@/components/log/RestockAITab";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`report-tabpanel-${index}`}
            aria-labelledby={`report-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString("vi-VN");
};

export const InventoryReportLogsPage = () => {
    const { showToast } = useToast();
    const [logs, setLogs] = useState<AIInventoryReportLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Detail dialog
    const [selectedLog, setSelectedLog] = useState<AIInventoryReportLog | null>(null);

    // AI report job dialog
    const [aiDialogOpen, setAiDialogOpen] = useState(false);

    // Tab control
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLogs = async () => {
        try {
            setLoading(true);
            const response = await inventoryService.getInventoryReportLogsPaged();
            setLogs(response.data?.items ?? []);
        } catch (error) {
            console.error("Failed to load inventory report logs:", error);
            showToast("Không thể tải danh sách log báo cáo tồn kho.", "error");
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
        <AdminLayout>
            <Box sx={{ width: "100%" }}>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="inventory report tabs">
                        <Tab label="Báo cáo Tồn kho" id="report-tab-0" aria-controls="report-tabpanel-0" />
                        <Tab label="Dự đoán Nhập hàng" id="report-tab-1" aria-controls="report-tabpanel-1" />
                    </Tabs>
                </Box>

                <CustomTabPanel value={tabValue} index={0}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                        <Typography variant="h5" fontWeight="bold" color="primary.dark">
                            Lịch sử Báo cáo Tồn kho
                        </Typography>
                        <Tooltip title="Tạo báo cáo tồn kho bằng AI">
                            <Button
                                variant="contained"
                                startIcon={<AutoAwesomeIcon />}
                                onClick={() => setAiDialogOpen(true)}
                            >
                                Tạo báo cáo AI
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
                                                <Tooltip title="Xem chi tiết">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setSelectedLog(log)}
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
                </CustomTabPanel>

                <CustomTabPanel value={tabValue} index={1}>
                    <RestockAITab />
                </CustomTabPanel>
            </Box>

            <InventoryLogDetailDialog
                open={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                log={selectedLog}
            />

            <AIInventoryReportDialog
                open={aiDialogOpen}
                onClose={() => setAiDialogOpen(false)}
            />
        </AdminLayout>
    );
};
