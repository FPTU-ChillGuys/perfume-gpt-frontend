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
  Inventory as InventoryIcon,
  LocalShipping as ImportIcon,
  ShoppingCart as SalesIcon,
  Build as AdjustmentIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ledgerService } from "@/services/ledgerService";
import { productService } from "@/services/productService";
import type {
  InventoryLedgerEntry,
  InventoryLedgerParams,
  InventoryLedgerType,
} from "@/types/ledger";
import type { VariantLookupItem } from "@/types/product";

/* ────────────── helpers ────────────── */

const TYPE_CONFIG: Record<
  InventoryLedgerType,
  {
    label: string;
    color: "success" | "error" | "warning";
    icon: React.ReactElement;
  }
> = {
  Import: {
    label: "Nhập hàng",
    color: "success",
    icon: <ImportIcon fontSize="small" />,
  },
  Sales: {
    label: "Bán hàng",
    color: "error",
    icon: <SalesIcon fontSize="small" />,
  },
  Adjustment: {
    label: "Điều chỉnh",
    color: "warning",
    icon: <AdjustmentIcon fontSize="small" />,
  },
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatQuantityChange = (qty: number) => {
  if (qty > 0) return `+${qty}`;
  return String(qty);
};

/* ────────────── summary card ────────────── */

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactElement;
  color: string;
  bgColor: string;
  valueColor?: string;
  loading?: boolean;
}

const SummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  bgColor,
  valueColor,
  loading,
}: SummaryCardProps) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      border: "1px solid",
      borderColor: "grey.100",
      borderRadius: 3,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 1,
      bgcolor: bgColor,
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
          boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
        }}
      >
        {icon}
      </Box>
    </Stack>
    {loading ? (
      <Skeleton variant="text" width={80} height={40} />
    ) : (
      <Typography variant="h5" fontWeight={700} sx={{ color: valueColor }}>
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

export const InventoryLedgerPage = () => {
  const [entries, setEntries] = useState<InventoryLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Filters
  const [typeFilter, setTypeFilter] = useState<InventoryLedgerType | "">("");
  const [variantFilter, setVariantFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    increase: 0,
    decrease: 0,
    netChange: 0,
  });

  // Variant name map
  const [variantMap, setVariantMap] = useState<Map<string, VariantLookupItem>>(
    new Map(),
  );

  useEffect(() => {
    const load = async () => {
      try {
        const items = await productService.getProductVariants();
        const map = new Map<string, VariantLookupItem>();
        for (const item of items) {
          if (item.id) map.set(item.id, item);
        }
        setVariantMap(map);
      } catch {
        // silently fail
      }
    };
    load();
  }, []);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: InventoryLedgerParams = {
        PageNumber: page + 1,
        PageSize: rowsPerPage,
        IsDescending: true,
        SortBy: "CreatedAt",
        SortOrder: "desc",
      };
      if (typeFilter) params.Type = typeFilter;
      if (variantFilter.trim()) params.VariantId = variantFilter.trim();
      if (fromDate) params.FromDate = new Date(fromDate).toISOString();
      if (toDate) params.ToDate = new Date(toDate).toISOString();

      const data = await ledgerService.getInventoryLedger(params);
      setEntries(data.items);
      setTotalCount(data.totalCount);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể tải dữ liệu sổ kho";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, typeFilter, variantFilter, fromDate, toDate]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  useEffect(() => {
    const fetchOverallStats = async () => {
      try {
        setStatsLoading(true);
        const baseParams: InventoryLedgerParams = {
          IsDescending: true,
          SortBy: "CreatedAt",
          SortOrder: "desc",
        };
        if (typeFilter) baseParams.Type = typeFilter;
        if (variantFilter.trim()) baseParams.VariantId = variantFilter.trim();
        if (fromDate) baseParams.FromDate = new Date(fromDate).toISOString();
        if (toDate) baseParams.ToDate = new Date(toDate).toISOString();

        let pageNumber = 1;
        const pageSize = 200;
        let hasNextPage = true;
        let increase = 0;
        let decrease = 0;
        let netChange = 0;

        while (hasNextPage) {
          const res = await ledgerService.getInventoryLedger({
            ...baseParams,
            PageNumber: pageNumber,
            PageSize: pageSize,
          });
          for (const e of res.items) {
            if (e.quantityChange > 0) increase += e.quantityChange;
            else decrease += Math.abs(e.quantityChange);
            netChange += e.quantityChange;
          }
          hasNextPage = res.hasNextPage;
          pageNumber += 1;
        }

        setOverallStats({ increase, decrease, netChange });
      } catch {
        setOverallStats({ increase: 0, decrease: 0, netChange: 0 });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchOverallStats();
  }, [typeFilter, variantFilter, fromDate, toDate]);

  const handleClearFilters = () => {
    setTypeFilter("");
    setVariantFilter("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const hasActiveFilters = Boolean(
    typeFilter || variantFilter || fromDate || toDate,
  );
  const activeFilterCount = [typeFilter, variantFilter, fromDate, toDate].filter(
    Boolean,
  ).length;

  return (
    <AdminLayout>
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3 }}>
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, lg: 3.5 }}>
            <Stack spacing={2}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.2,
                  border: "1px solid",
                  borderColor: "grey.200",
                  borderRadius: 3,
                  bgcolor: "#0f172a",
                  color: "white",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1 }}>
                  <InventoryIcon fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Sổ kho
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
                  Giao diện tập trung vào số liệu cốt lõi và thao tác lọc nhanh.
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Tooltip title="Tải lại">
                    <IconButton
                      onClick={fetchLedger}
                      disabled={loading}
                      sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "white" }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant={showFilters ? "contained" : "outlined"}
                    startIcon={<FilterListIcon />}
                    onClick={() => setShowFilters((prev) => !prev)}
                    sx={{
                      color: "white",
                      borderColor: "rgba(255,255,255,0.35)",
                      bgcolor: showFilters ? "rgba(255,255,255,0.18)" : "transparent",
                    }}
                  >
                    Bộ lọc
                  </Button>
                </Stack>
              </Paper>

              <SummaryCard
                title="Tăng / Giảm tồn"
                value={`+${overallStats.increase.toLocaleString("vi-VN")} / -${overallStats.decrease.toLocaleString("vi-VN")}`}
                subtitle="Đã bù trừ theo biến động thực tế"
                icon={<TrendingUpIcon fontSize="small" />}
                color="#16a34a"
                bgColor="#f0fdf4"
                valueColor="#166534"
                loading={statsLoading}
              />
              <SummaryCard
                title="Biến động ròng"
                value={formatQuantityChange(overallStats.netChange)}
                subtitle="Tổng thay đổi số lượng"
                icon={<TrendingDownIcon fontSize="small" />}
                color={overallStats.netChange >= 0 ? "#0891b2" : "#e11d48"}
                bgColor={overallStats.netChange >= 0 ? "#ecfeff" : "#fff1f2"}
                valueColor={overallStats.netChange >= 0 ? "#155e75" : "#9f1239"}
                loading={statsLoading}
              />

              {showFilters && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 3,
                    bgcolor: "#fafafa",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Bộ lọc
                    </Typography>
                    {hasActiveFilters && (
                      <Button size="small" startIcon={<ClearIcon />} onClick={handleClearFilters}>
                        Xóa
                      </Button>
                    )}
                  </Stack>
                  <Stack spacing={1.5}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Loại biến động</InputLabel>
                      <Select
                        label="Loại biến động"
                        value={typeFilter}
                        onChange={(e) => {
                          setTypeFilter(e.target.value as InventoryLedgerType | "");
                          setPage(0);
                        }}
                      >
                        <MenuItem value="">Tất cả</MenuItem>
                        <MenuItem value="Import">Nhập hàng</MenuItem>
                        <MenuItem value="Sales">Bán hàng</MenuItem>
                        <MenuItem value="Adjustment">Điều chỉnh</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Variant ID"
                      placeholder="Nhập variant ID..."
                      size="small"
                      fullWidth
                      value={variantFilter}
                      onChange={(e) => {
                        setVariantFilter(e.target.value);
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
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
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
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 8.5 }}>
            <Paper
              elevation={0}
              sx={{
                border: "1px solid",
                borderColor: "grey.200",
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: "background.paper",
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
                  bgcolor: "grey.100",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="subtitle2" color="text.primary" fontWeight={700}>
                    Lịch sử biến động kho
                  </Typography>
                  <Chip size="small" label={`${totalCount.toLocaleString("vi-VN")} bản ghi`} />
                  {hasActiveFilters && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`${activeFilterCount} bộ lọc đang bật`}
                    />
                  )}
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={showDetails ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  onClick={() => setShowDetails((prev) => !prev)}
                >
                  {showDetails ? "Ẩn thông tin phụ" : "Hiện thông tin phụ"}
                </Button>
              </Stack>

              {error && (
                <Alert
                  severity="error"
                  sx={{ m: 2, borderRadius: 2 }}
                  action={
                    <Button color="inherit" size="small" onClick={fetchLedger}>
                      Thử lại
                    </Button>
                  }
                >
                  {error}
                </Alert>
              )}

              <TableContainer sx={{ maxHeight: "74vh" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow
                      sx={{
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
                      <TableCell>Sản phẩm</TableCell>
                      <TableCell align="right">Thay đổi</TableCell>
                      <TableCell align="right">Tồn sau</TableCell>
                      {showDetails && <TableCell>SKU</TableCell>}
                      {showDetails && <TableCell>Batch ID</TableCell>}
                      {showDetails && <TableCell>Mô tả</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && entries.length === 0
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={`skel-${i}`}>
                            {Array.from({ length: showDetails ? 8 : 5 }).map((__, j) => (
                              <TableCell key={j}>
                                <Skeleton variant="text" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      : entries.map((entry) => {
                          const config = TYPE_CONFIG[entry.type];
                          const isPositive = entry.quantityChange > 0;
                          const variant = variantMap.get(entry.variantId);

                          return (
                            <TableRow
                              key={entry.id}
                              hover
                              sx={{
                                "&:last-child td": { borderBottom: 0 },
                                "&:nth-of-type(even)": { bgcolor: "grey.50" },
                              }}
                            >
                          {/* Timestamp */}
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Typography variant="body2" fontSize="0.82rem">
                              {formatDateTime(entry.createdAt)}
                            </Typography>
                          </TableCell>

                          {/* Type chip */}
                          <TableCell>
                            <Chip
                              icon={config.icon}
                              label={config.label}
                              size="small"
                              color={config.color}
                              variant="outlined"
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.75rem",
                                minWidth: 96,
                                justifyContent: "flex-start",
                              }}
                            />
                          </TableCell>

                          {/* Variant info */}
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                            >
                              {variant?.primaryImageUrl && (
                                <Box
                                  component="img"
                                  src={variant.primaryImageUrl}
                                  alt={variant.displayName}
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1,
                                    objectFit: "cover",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <Box>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  fontSize="0.82rem"
                                >
                                  {variant?.displayName || entry.variantId}
                                </Typography>
                                {variant?.concentrationName && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    component="div"
                                  >
                                    {variant.concentrationName}
                                    {variant.volumeMl
                                      ? ` · ${variant.volumeMl}ml`
                                      : ""}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>

                          {/* Quantity change */}
                          <TableCell align="right">
                            <Chip
                              label={formatQuantityChange(
                                entry.quantityChange,
                              )}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.82rem",
                                fontFamily: "monospace",
                                bgcolor: isPositive ? "#dcfce7" : "#fee2e2",
                                color: isPositive ? "#166534" : "#991b1b",
                                border: "1px solid",
                                borderColor: isPositive
                                  ? "#bbf7d0"
                                  : "#fecaca",
                                minWidth: 56,
                              }}
                            />
                          </TableCell>

                          {/* Balance after */}
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              fontFamily="monospace"
                              fontSize="0.85rem"
                            >
                              {entry.balanceAfter.toLocaleString("vi-VN")}
                            </Typography>
                          </TableCell>

                          {showDetails && (
                            <TableCell>
                              <Typography
                                variant="body2"
                                fontSize="0.82rem"
                                sx={{ fontFamily: "monospace" }}
                              >
                                {variant?.sku || "—"}
                              </Typography>
                            </TableCell>
                          )}
                          {showDetails && (
                            <TableCell>
                              <Typography
                                variant="body2"
                                fontSize="0.82rem"
                                sx={{
                                  fontFamily: "monospace",
                                  color: "text.secondary",
                                }}
                              >
                                {entry.batchId}
                              </Typography>
                            </TableCell>
                          )}
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
                            </TableRow>
                          );
                        })}

                    {!loading && entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={showDetails ? 8 : 5} sx={{ py: 8, textAlign: "center" }}>
                          <InventoryIcon sx={{ fontSize: 48, color: "grey.300", mb: 1 }} />
                          <Typography variant="body1" color="text.secondary">
                            Chưa có bản ghi nào
                          </Typography>
                          <Typography variant="body2" color="text.disabled">
                            {hasActiveFilters
                              ? "Thử thay đổi bộ lọc để tìm kết quả khác"
                              : "Dữ liệu sổ kho sẽ xuất hiện khi có nhập/xuất hàng"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

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
                  bgcolor: "grey.50",
                }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};
