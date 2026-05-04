import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalanceWallet as WalletIcon,
  ArrowUpward as InIcon,
  ArrowDownward as OutIcon,
  Payment as PaymentIcon,
  Replay as RefundIcon,
  LocalShipping as ShippingIcon,
  Store as SupplierIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ledgerService } from "@/services/ledgerService";
import type {
  CashFlowCategory,
  CashFlowEntry,
  CashFlowParams,
  CashFlowType,
} from "@/types/ledger";

/* ────────────── helpers ────────────── */

const FLOW_TYPE_CONFIG: Record<
  CashFlowType,
  { label: string; color: "success" | "error"; icon: React.ReactElement }
> = {
  In: {
    label: "Thu vào",
    color: "success",
    icon: <InIcon fontSize="small" />,
  },
  Out: {
    label: "Chi ra",
    color: "error",
    icon: <OutIcon fontSize="small" />,
  },
};

const CATEGORY_CONFIG: Record<
  CashFlowCategory,
  { label: string; color: string; bgColor: string; icon: React.ReactElement }
> = {
  OrderPayment: {
    label: "Thanh toán đơn hàng",
    color: "#1565c0",
    bgColor: "#e3f2fd",
    icon: <PaymentIcon fontSize="small" />,
  },
  Refund: {
    label: "Hoàn tiền",
    color: "#c62828",
    bgColor: "#ffebee",
    icon: <RefundIcon fontSize="small" />,
  },
  ShippingFeeToGHN: {
    label: "Phí vận chuyển GHN",
    color: "#e65100",
    bgColor: "#fff3e0",
    icon: <ShippingIcon fontSize="small" />,
  },
  SupplierPayment: {
    label: "Thanh toán nhà cung cấp",
    color: "#4a148c",
    bgColor: "#f3e5f5",
    icon: <SupplierIcon fontSize="small" />,
  },
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const adjusted = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return adjusted.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("vi-VN") + " ₫";

/* ────────────── summary card ────────────── */

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactElement;
  color: string;
  loading?: boolean;
}

const SummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  loading,
}: SummaryCardProps) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      border: "1px solid",
      borderColor: "grey.200",
      borderRadius: 3,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 1,
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {title}
      </Typography>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: color,
          color: "white",
        }}
      >
        {icon}
      </Box>
    </Stack>
    {loading ? (
      <Skeleton variant="text" width={120} height={40} />
    ) : (
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
    )}
    {subtitle && (
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Paper>
);

/* ────────────── main page ────────────── */

export const CashFlowLedgerPage = () => {
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Filters
  const [flowTypeFilter, setFlowTypeFilter] = useState<CashFlowType | "">("");
  const [categoryFilter, setCategoryFilter] = useState<
    CashFlowCategory | ""
  >("");
  const [refCodeFilter, setRefCodeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalIn: 0,
    totalOut: 0,
    net: 0,
  });

  const fetchCashFlow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: CashFlowParams = {
        PageNumber: page + 1,
        PageSize: rowsPerPage,
        IsDescending: true,
        SortBy: "TransactionDate",
        SortOrder: "desc",
      };
      if (flowTypeFilter) params.FlowType = flowTypeFilter;
      if (categoryFilter) params.Category = categoryFilter;
      if (refCodeFilter.trim()) params.ReferenceCode = refCodeFilter.trim();
      if (fromDate) params.FromDate = new Date(fromDate).toISOString();
      if (toDate) params.ToDate = new Date(toDate).toISOString();

      const data = await ledgerService.getCashFlowLedger(params);
      setEntries(data.items);
      setTotalCount(data.totalCount);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu dòng tiền";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, flowTypeFilter, categoryFilter, refCodeFilter, fromDate, toDate]);

  useEffect(() => {
    fetchCashFlow();
  }, [fetchCashFlow]);

  useEffect(() => {
    const fetchOverallStats = async () => {
      try {
        setStatsLoading(true);
        const baseParams: CashFlowParams = {
          IsDescending: true,
          SortBy: "TransactionDate",
          SortOrder: "desc",
        };
        if (flowTypeFilter) baseParams.FlowType = flowTypeFilter;
        if (categoryFilter) baseParams.Category = categoryFilter;
        if (refCodeFilter.trim())
          baseParams.ReferenceCode = refCodeFilter.trim();
        if (fromDate) baseParams.FromDate = new Date(fromDate).toISOString();
        if (toDate) baseParams.ToDate = new Date(toDate).toISOString();

        let pageNumber = 1;
        const pageSize = 200;
        let hasNextPage = true;
        let totalIn = 0;
        let totalOut = 0;
        let net = 0;

        while (hasNextPage) {
          const res = await ledgerService.getCashFlowLedger({
            ...baseParams,
            PageNumber: pageNumber,
            PageSize: pageSize,
          });
          for (const e of res.items) {
            const normalizedAmount =
              e.flowType === "In" ? Math.abs(e.amount) : -Math.abs(e.amount);
            if (normalizedAmount >= 0) {
              totalIn += normalizedAmount;
            } else {
              totalOut += Math.abs(normalizedAmount);
            }
            net += normalizedAmount;
          }
          hasNextPage = res.hasNextPage;
          pageNumber += 1;
        }

        setOverallStats({ totalIn, totalOut, net });
      } catch {
        setOverallStats({ totalIn: 0, totalOut: 0, net: 0 });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchOverallStats();
  }, [flowTypeFilter, categoryFilter, refCodeFilter, fromDate, toDate]);

  const handleClearFilters = () => {
    setFlowTypeFilter("");
    setCategoryFilter("");
    setRefCodeFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const hasActiveFilters = Boolean(
    flowTypeFilter || categoryFilter || refCodeFilter || fromDate || toDate,
  );

  return (
    <AdminLayout>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        {/* Header */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#6366f1",
                  color: "white",
                }}
              >
                <WalletIcon />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Sổ dòng tiền
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Theo dõi thu chi từ thanh toán đơn hàng, hoàn tiền, vận
                  chuyển và nhà cung cấp
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant={showFilters ? "contained" : "outlined"}
              startIcon={<FilterListIcon />}
              onClick={() => setShowFilters(!showFilters)}
              size="small"
            >
              Bộ lọc
              {hasActiveFilters && (
                <Chip
                  label="!"
                  size="small"
                  color="error"
                  sx={{ ml: 0.5, height: 18, minWidth: 18, fontSize: 11 }}
                />
              )}
            </Button>
            <Tooltip title="Tải lại">
              <IconButton onClick={fetchCashFlow} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <SummaryCard
              title="Tổng thu "
              value={formatCurrency(overallStats.totalIn)}
              
              icon={<TrendingUpIcon fontSize="small" />}
              color="#16a34a"
              loading={statsLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <SummaryCard
              title="Tổng chi"
              value={formatCurrency(overallStats.totalOut)}
              
              icon={<TrendingDownIcon fontSize="small" />}
              color="#dc2626"
              loading={statsLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <SummaryCard
              title="Chênh lệch"
              value={
                (overallStats.net >= 0 ? "+" : "") +
                formatCurrency(overallStats.net)
              }
              
              icon={<WalletIcon fontSize="small" />}
              color={overallStats.net >= 0 ? "#0891b2" : "#e11d48"}
              loading={statsLoading}
            />
          </Grid>
        </Grid>

        {/* Filters panel */}
        {showFilters && (
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 3,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Bộ lọc nâng cao
              </Typography>
              {hasActiveFilters && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearFilters}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </Stack>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Loại dòng tiền</InputLabel>
                  <Select
                    label="Loại dòng tiền"
                    value={flowTypeFilter}
                    onChange={(e) => {
                      setFlowTypeFilter(
                        e.target.value as CashFlowType | "",
                      );
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="In">Thu vào</MenuItem>
                    <MenuItem value="Out">Chi ra</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Danh mục</InputLabel>
                  <Select
                    label="Danh mục"
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(
                        e.target.value as CashFlowCategory | "",
                      );
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="OrderPayment">Thanh toán đơn hàng</MenuItem>
                    <MenuItem value="Refund">Hoàn tiền</MenuItem>
                    <MenuItem value="ShippingFeeToGHN">Phí vận chuyển GHN</MenuItem>
                    <MenuItem value="SupplierPayment">Thanh toán NCC</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <TextField
                  label="Mã tham chiếu"
                  placeholder="Nhập mã đơn hàng…"
                  size="small"
                  fullWidth
                  value={refCodeFilter}
                  onChange={(e) => {
                    setRefCodeFilter(e.target.value);
                    setPage(0);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <TextField
                  label="Từ ngày"
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(0);
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <TextField
                  label="Đến ngày"
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(0);
                  }}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Error */}
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={fetchCashFlow}>
                Thử lại
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "grey.200",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "grey.200",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              Lịch sử thu chi gần nhất
            </Typography>
            <Button
              size="small"
              variant="text"
              startIcon={showDetails ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setShowDetails((prev) => !prev)}
            >
              {showDetails ? "Ẩn thông tin phụ" : "Hiện thông tin phụ"}
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "grey.50",
                    "& th": {
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                      py: 1.5,
                    },
                  }}
                >
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Loại</TableCell>
                  <TableCell>Danh mục</TableCell>
                  <TableCell align="right">Số tiền</TableCell>
                  {showDetails && <TableCell>Mô tả</TableCell>}
                  {showDetails && <TableCell>Mã tham chiếu</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && entries.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        {Array.from({ length: showDetails ? 6 : 4 }).map(
                          (__, j) => (
                          <TableCell key={j}>
                            <Skeleton variant="text" />
                          </TableCell>
                          ),
                        )}
                      </TableRow>
                    ))
                  : entries.map((entry) => {
                      const flowConfig = FLOW_TYPE_CONFIG[entry.flowType];
                      const catConfig = CATEGORY_CONFIG[entry.category];
                      const isIn = entry.flowType === "In";

                      return (
                        <TableRow
                          key={entry.id}
                          hover
                          sx={{
                            "&:last-child td": { borderBottom: 0 },
                            transition: "background-color 0.15s",
                          }}
                        >
                          {/* Timestamp */}
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography variant="body2" fontSize="0.82rem">
                              {formatDateTime(entry.transactionDate)}
                            </Typography>
                          </TableCell>

                          {/* Flow type */}
                          <TableCell>
                            <Chip
                              icon={flowConfig.icon}
                              label={flowConfig.label}
                              size="small"
                              color={flowConfig.color}
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: "0.75rem" }}
                            />
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <Chip
                              icon={catConfig.icon}
                              label={catConfig.label}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.73rem",
                                bgcolor: catConfig.bgColor,
                                color: catConfig.color,
                                border: "none",
                                "& .MuiChip-icon": {
                                  color: catConfig.color,
                                },
                              }}
                            />
                          </TableCell>

                          {/* Amount */}
                          <TableCell align="right">
                            <Chip
                              label={
                                (isIn ? "+" : "-") +
                                formatCurrency(Math.abs(entry.amount))
                              }
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                fontFamily: "monospace",
                                bgcolor: isIn ? "#dcfce7" : "#fee2e2",
                                color: isIn ? "#166534" : "#991b1b",
                                border: "1px solid",
                                borderColor: isIn ? "#bbf7d0" : "#fecaca",
                                minWidth: 100,
                              }}
                            />
                          </TableCell>

                          {showDetails && (
                            <TableCell>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontSize="0.82rem"
                              >
                                {entry.description || "—"}
                              </Typography>
                            </TableCell>
                          )}
                          {showDetails && (
                            <TableCell>
                              {entry.referenceCode ? (
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  fontSize="0.82rem"
                                  sx={{
                                    fontFamily: "monospace",
                                    color: "primary.main",
                                  }}
                                >
                                  {entry.referenceCode}
                                </Typography>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.disabled"
                                  fontSize="0.82rem"
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}

                {/* Empty state */}
                {!loading && entries.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={showDetails ? 6 : 4}
                      sx={{ py: 8, textAlign: "center" }}
                    >
                      <WalletIcon
                        sx={{ fontSize: 48, color: "grey.300", mb: 1 }}
                      />
                      <Typography variant="body1" color="text.secondary">
                        Chưa có giao dịch nào
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        {hasActiveFilters
                          ? "Thử thay đổi bộ lọc để tìm kết quả khác"
                          : "Dữ liệu dòng tiền sẽ xuất hiện khi có giao dịch thu/chi"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Loading overlay */}
          {loading && entries.length > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 1,
                bgcolor: "grey.50",
              }}
            >
              <CircularProgress size={20} />
            </Box>
          )}

          {/* Pagination */}
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            labelRowsPerPage="Dòng/trang:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} trên ${count !== -1 ? count : `hơn ${to}`}`
            }
            sx={{
              borderTop: "1px solid",
              borderColor: "grey.200",
            }}
          />
        </Paper>
      </Box>
    </AdminLayout>
  );
};
