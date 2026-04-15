import { useCallback, useEffect, useMemo, useState } from "react";
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
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapVert as SwapVertIcon,
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
      <Skeleton variant="text" width={80} height={40} />
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

  const stats = useMemo(() => {
    let imports = 0;
    let sales = 0;
    let adjustments = 0;
    for (const e of entries) {
      if (e.type === "Import") imports += e.quantityChange;
      else if (e.type === "Sales") sales += Math.abs(e.quantityChange);
      else adjustments += e.quantityChange;
    }
    return { imports, sales, adjustments };
  }, [entries]);

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
                  bgcolor: "primary.main",
                  color: "white",
                }}
              >
                <InventoryIcon />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  Sổ kho – Lịch sử biến động
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Theo dõi mọi thay đổi số lượng khi nhập hàng, bán hàng và
                  điều chỉnh tồn kho
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
              <IconButton onClick={fetchLedger} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Summary cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <SummaryCard
              title="Tổng bản ghi"
              value={totalCount.toLocaleString("vi-VN")}
              subtitle={`Trang hiện tại: ${entries.length} mục`}
              icon={<SwapVertIcon fontSize="small" />}
              color="#6366f1"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <SummaryCard
              title="Nhập hàng"
              value={`+${stats.imports.toLocaleString("vi-VN")}`}
              subtitle="Tổng SL nhập (trang này)"
              icon={<TrendingUpIcon fontSize="small" />}
              color="#16a34a"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <SummaryCard
              title="Bán hàng"
              value={`-${stats.sales.toLocaleString("vi-VN")}`}
              subtitle="Tổng SL bán (trang này)"
              icon={<TrendingDownIcon fontSize="small" />}
              color="#dc2626"
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <SummaryCard
              title="Điều chỉnh"
              value={stats.adjustments.toLocaleString("vi-VN")}
              subtitle="Tổng SL điều chỉnh (trang này)"
              icon={<AdjustmentIcon fontSize="small" />}
              color="#ea580c"
              loading={loading}
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
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Loại biến động</InputLabel>
                  <Select
                    label="Loại biến động"
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(
                        e.target.value as InventoryLedgerType | "",
                      );
                      setPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="Import">Nhập hàng</MenuItem>
                    <MenuItem value="Sales">Bán hàng</MenuItem>
                    <MenuItem value="Adjustment">Điều chỉnh</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  label="Variant ID"
                  placeholder="Nhập variant ID…"
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
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
              <Button color="inherit" size="small" onClick={fetchLedger}>
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
                  <TableCell>Sản phẩm</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Batch ID</TableCell>
                  <TableCell align="right">Thay đổi</TableCell>
                  <TableCell align="right">Tồn sau</TableCell>
                  <TableCell>Mô tả</TableCell>
                  <TableCell>Ref ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && entries.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`skel-${i}`}>
                        {Array.from({ length: 9 }).map((__, j) => (
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
                            transition: "background-color 0.15s",
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
                              sx={{ fontWeight: 600, fontSize: "0.75rem" }}
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

                          {/* SKU */}
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontSize="0.82rem"
                              sx={{ fontFamily: "monospace" }}
                            >
                              {variant?.sku || "—"}
                            </Typography>
                          </TableCell>

                          {/* Batch */}
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

                          {/* Description */}
                          <TableCell>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontSize="0.82rem"
                            >
                              {entry.description || "—"}
                            </Typography>
                          </TableCell>

                          {/* Reference */}
                          <TableCell>
                            {entry.referenceId ? (
                              <Typography
                                variant="body2"
                                fontSize="0.82rem"
                                sx={{
                                  fontFamily: "monospace",
                                  color: "primary.main",
                                }}
                              >
                                {entry.referenceId}
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
                        </TableRow>
                      );
                    })}

                {/* Empty state */}
                {!loading && entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ py: 8, textAlign: "center" }}>
                      <InventoryIcon
                        sx={{ fontSize: 48, color: "grey.300", mb: 1 }}
                      />
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
