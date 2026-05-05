import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Inventory2 as InventoryIcon,
  WarningAmber as WarningIcon,
  Layers as LayersIcon,
  PendingActions as PendingIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { AdminLayout } from "@/layouts/AdminLayout";
import {
  inventoryService,
  type BatchDetailResponse,
  type InventorySummaryResponse,
  type StockResponse,
} from "@/services/inventoryService";
import {
  stockAdjustmentService,
  type StockAdjustmentDetailResponse,
  type StockAdjustmentReason,
  type StockAdjustmentResponse,
  type StockAdjustmentStatus,
} from "@/services/stockAdjustmentService";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { LoadingButton } from "@/components/common/LoadingButton";

type InventoryTab = "inventory" | "requests";
type StockStatusFilter = NonNullable<StockResponse["status"]> | "";
type CategoryTab = "all" | "women" | "men" | "unisex" | "niche";

const REASON_LABELS: Record<StockAdjustmentReason, string> = {
  Damage: "Hư hại",
  Expired: "Hết hạn",
  Theft: "Thất thoát",
  Loss: "Mất mát",
  Found: "Tìm thấy",
  Correction: "Điều chỉnh",
  Return: "Hoàn trả",
  Other: "Khác",
};

const STATUS_LABELS: Record<StockAdjustmentStatus, string> = {
  Pending: "Chờ duyệt",
  InProgress: "Đang xử lý",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
};

const CATEGORY_OPTIONS: Array<{ key: CategoryTab; label: string; id?: number }> = [
  { key: "all", label: "Tất cả" },
  { key: "women", label: "Nước hoa nữ", id: 1 },
  { key: "men", label: "Nước hoa nam", id: 2 },
  { key: "unisex", label: "Unisex", id: 3 },
  { key: "niche", label: "Niche", id: 4 },
];

const ADJUSTMENT_REASON_OPTIONS: StockAdjustmentReason[] = [
  "Damage",
  "Expired",
  "Theft",
  "Loss",
  "Found",
  "Correction",
  "Return",
  "Other",
];

const ADJUSTMENT_STATUS_OPTIONS: Array<StockAdjustmentStatus | ""> = [
  "",
  "Pending",
  "InProgress",
  "Completed",
  "Cancelled",
];

const stockChip = (status?: StockResponse["status"]) => {
  if (status === "OutOfStock") return { label: "Hết hàng", color: "error" as const };
  if (status === "LowStock") return { label: "Sắp hết", color: "warning" as const };
  return { label: "Bình thường", color: "success" as const };
};

const requestChip = (status?: StockAdjustmentStatus) => {
  if (status === "Pending") return "warning" as const;
  if (status === "InProgress") return "info" as const;
  if (status === "Completed") return "success" as const;
  return "default" as const;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

const toInt = (value: string, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getStockKey = (stock: StockResponse) => stock.variantId || stock.id || stock.variantSku;

const batchExpiryChip = (batch: BatchDetailResponse) => {
  if (batch.isExpired || (typeof batch.daysUntilExpiry === "number" && batch.daysUntilExpiry < 0)) {
    return { label: "Đã hết hạn", color: "error" as const };
  }

  const getRemainingTime = (expiryDateStr?: string | null) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    if (expiry <= now) return "Đã hết hạn";

    let years = expiry.getFullYear() - now.getFullYear();
    let months = expiry.getMonth() - now.getMonth();
    let days = expiry.getDate() - now.getDate();

    if (days < 0) {
      months--;
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      days += lastDayOfMonth;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} năm`);
    if (months > 0) parts.push(`${months} tháng`);
    if (days > 0) parts.push(`${days} ngày`);

    return parts.length > 0 ? `Còn ${parts.join(" ")}` : "Hôm nay hết hạn";
  };

  const remainingLabel = getRemainingTime(batch.expiryDate);

  if (remainingLabel) {
    const color = (typeof batch.daysUntilExpiry === "number" && batch.daysUntilExpiry <= 30) ? ("warning" as const) : ("success" as const);
    return { label: remainingLabel, color };
  }

  return { label: "Đang bán", color: "success" as const };
};

export const InventoryManagementPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const tableRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<InventoryTab>("inventory");
  const [summary, setSummary] = useState<InventorySummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [stocks, setStocks] = useState<StockResponse[]>([]);
  const [stockBatchMap, setStockBatchMap] = useState<Record<string, BatchDetailResponse[]>>({});
  const [stockBatchLoading, setStockBatchLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockPage, setStockPage] = useState(0);
  const [stockRowsPerPage, setStockRowsPerPage] = useState(10);
  const [stockTotalCount, setStockTotalCount] = useState(0);

  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingThreshold, setEditingThreshold] = useState<string>("");
  const [thresholdUpdating, setThresholdUpdating] = useState(false);

  const handleUpdateThreshold = async (stockId: string) => {
    try {
      setThresholdUpdating(true);
      const threshold = toInt(editingThreshold, 0);
      await inventoryService.updateStock(stockId, threshold);
      showToast("Cập nhật ngưỡng cảnh báo thành công", "success");
      setEditingStockId(null);
      void loadStocks();
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setThresholdUpdating(false);
    }
  };
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [batchCodeInput, setBatchCodeInput] = useState("");
  const [batchCodeQuery, setBatchCodeQuery] = useState("");
  const [daysUntilExpiryFilter, setDaysUntilExpiryFilter] = useState<number | "">("");

  const [requests, setRequests] = useState<StockAdjustmentResponse[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestPage, setRequestPage] = useState(0);
  const [requestRowsPerPage, setRequestRowsPerPage] = useState(10);
  const [requestTotalCount, setRequestTotalCount] = useState(0);
  const [requestStatusFilter, setRequestStatusFilter] = useState<StockAdjustmentStatus | "">("");
  const [requestReasonFilter, setRequestReasonFilter] = useState<StockAdjustmentReason | "">("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    variantId: "",
    batchId: "",
    productName: "",
    batchCode: "",
    adjustmentQuantity: "1",
    reason: "Damage" as StockAdjustmentReason,
    note: "",
  });

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSubmitting, setDetailSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StockAdjustmentResponse | null>(null);
  const [verifyDrafts, setVerifyDrafts] = useState<
    Array<{ detailId: string; approvedQuantity: string; note: string }>
  >([]);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummary(await inventoryService.getSummary());
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể tải tổng quan", "error");
    } finally {
      setSummaryLoading(false);
    }
  }, [showToast]);

  const loadStocks = useCallback(async () => {
    try {
      setStockLoading(true);
      setStockBatchLoading(false);
      setStockError(null);
      const categoryId = CATEGORY_OPTIONS.find((item) => item.key === categoryTab)?.id;
      const result = await inventoryService.getStock({
        CategoryId: categoryId,
        SKU: searchQuery || undefined,
        BatchCode: batchCodeQuery || undefined,
        DaysUntilExpiry: daysUntilExpiryFilter !== "" ? Number(daysUntilExpiryFilter) : undefined,
        StockStatus: stockStatusFilter || undefined,
        PageNumber: stockPage + 1,
        PageSize: stockRowsPerPage,
      });
      const nextStocks = result.items || [];
      setStocks(nextStocks);
      setStockTotalCount(result.totalCount || 0);
      setStockBatchMap({});

      const stocksWithVariant = nextStocks.filter((stock) => stock.variantId);
      if (stocksWithVariant.length > 0) {
        setStockBatchLoading(true);
        const batchResults = await Promise.allSettled(
          stocksWithVariant.map(async (stock) => ({
            key: getStockKey(stock),
            items: await inventoryService.getBatchesByVariant(stock.variantId || ""),
          })),
        );
        const nextBatchMap: Record<string, BatchDetailResponse[]> = {};
        batchResults.forEach((result) => {
          if (result.status === "fulfilled" && result.value.key) {
            nextBatchMap[result.value.key] = result.value.items;
          }
        });
        setStockBatchMap(nextBatchMap);
      }
      
      // Scroll to table container after loading new page
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    } catch (error) {
      setStockError(error instanceof Error ? error.message : "Không thể tải tồn kho");
    } finally {
      setStockLoading(false);
      setStockBatchLoading(false);
    }
  }, [categoryTab, searchQuery, batchCodeQuery, daysUntilExpiryFilter, stockStatusFilter, stockPage, stockRowsPerPage]);

  const loadRequests = useCallback(async () => {
    try {
      setRequestLoading(true);
      setRequestError(null);
      const result = await stockAdjustmentService.getAdjustments({
        Status: requestStatusFilter || undefined,
        Reason: requestReasonFilter || undefined,
        PageNumber: requestPage + 1,
        PageSize: requestRowsPerPage,
      });
      setRequests((result.items as StockAdjustmentResponse[]) || []);
      setRequestTotalCount(result.totalCount || 0);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Không thể tải danh sách yêu cầu");
    } finally {
      setRequestLoading(false);
    }
  }, [requestStatusFilter, requestReasonFilter, requestPage, requestRowsPerPage]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (tab === "inventory") void loadStocks();
  }, [tab, loadStocks]);

  useEffect(() => {
    if (tab === "requests") void loadRequests();
  }, [tab, loadRequests]);

  const cards = useMemo(
    () => [
      { label: "Tổng biến thể", value: summary?.totalVariants ?? 0, icon: <InventoryIcon color="primary" fontSize="small" /> },
      { label: "Sắp hết hàng", value: summary?.lowStockVariantsCount ?? 0, icon: <WarningIcon color="warning" fontSize="small" /> },
      { label: "Tổng lô hàng", value: summary?.totalBatches ?? 0, icon: <LayersIcon color="info" fontSize="small" /> },
      { label: "Yêu cầu chờ duyệt", value: requests.filter((item) => item.status === "Pending").length, icon: <PendingIcon color="warning" fontSize="small" /> },
    ],
    [requests, summary],
  );

  const openCreateDialog = (variantId?: string, batchId?: string, productName?: string, batchCode?: string) => {
    setCreatePayload({
      variantId: variantId || "",
      batchId: batchId || "",
      productName: productName || "",
      batchCode: batchCode || "",
      adjustmentQuantity: "1",
      reason: "Damage",
      note: "",
    });
    setCreateDialogOpen(true);
  };

  const handleCreateRequest = async () => {
    const quantity = toInt(createPayload.adjustmentQuantity, 0);
    if (!createPayload.variantId.trim() || !createPayload.batchId.trim() || quantity <= 0) {
      showToast("Mã biến thể, mã lô hàng và số lượng phải hợp lệ", "warning");
      return;
    }
    try {
      setCreateSubmitting(true);
      await stockAdjustmentService.createAdjustment({
        adjustmentDate: new Date().toISOString(),
        reason: createPayload.reason,
        note: createPayload.note.trim() || null,
        adjustmentDetails: [{
          variantId: createPayload.variantId.trim(),
          batchId: createPayload.batchId.trim(),
          adjustmentQuantity: quantity,
          note: createPayload.note.trim() || null,
        }],
      });
      setCreateDialogOpen(false);
      showToast("Tạo yêu cầu thành công", "success");
      if (tab === "requests") void loadRequests();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể tạo yêu cầu", "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openRequestDetail = async (requestId?: string) => {
    if (!requestId) return;
    try {
      setDetailLoading(true);
      const detail = await stockAdjustmentService.getAdjustmentById(requestId);
      setSelectedRequest(detail);
      setVerifyDrafts((detail?.adjustmentDetails || [])
        .filter((item): item is StockAdjustmentDetailResponse & { id: string } => Boolean(item.id))
        .map((item) => ({
          detailId: item.id,
          approvedQuantity: String(item.approvedQuantity ?? item.adjustmentQuantity ?? 0),
          note: item.note || "",
        })));
      setDetailDialogOpen(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể tải chi tiết", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateRequestStatus = async (status: Extract<StockAdjustmentStatus, "InProgress" | "Cancelled">) => {
    if (!selectedRequest?.id) return;
    try {
      setDetailSubmitting(true);
      await stockAdjustmentService.updateAdjustmentStatus(selectedRequest.id, { status });
      setSelectedRequest(await stockAdjustmentService.getAdjustmentById(selectedRequest.id));
      void loadRequests();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể cập nhật trạng thái", "error");
    } finally {
      setDetailSubmitting(false);
    }
  };

  const handleVerifyRequest = async () => {
    if (!selectedRequest?.id || selectedRequest.status !== "InProgress") return;
    const detailMap = new Map((selectedRequest.adjustmentDetails || [])
      .filter((item): item is StockAdjustmentDetailResponse & { id: string } => Boolean(item.id))
      .map((item) => [item.id, item]));
    const payload = verifyDrafts
      .filter((item) => detailMap.has(item.detailId))
      .map((item) => ({ detailId: item.detailId, approvedQuantity: toInt(item.approvedQuantity, 0), note: item.note.trim() || null }));
    try {
      setDetailSubmitting(true);
      await stockAdjustmentService.verifyAdjustment(selectedRequest.id, { adjustmentDetails: payload });
      setSelectedRequest(await stockAdjustmentService.getAdjustmentById(selectedRequest.id));
      void loadRequests();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể duyệt yêu cầu", "error");
    } finally {
      setDetailSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Stack spacing={2.5}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" }, gap: 2 }}>
          {cards.map((card) => (
            <Card key={card.label} sx={{ borderRadius: 2.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                </Stack>
                {summaryLoading ? <Skeleton sx={{ mt: 1 }} width={80} /> : <Typography variant="h4" fontWeight={700}>{new Intl.NumberFormat("vi-VN").format(card.value)}</Typography>}
              </CardContent>
            </Card>
          ))}
        </Box>

        <Paper sx={{ borderRadius: 2.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          <Tabs value={tab} onChange={(_, value: InventoryTab) => setTab(value)} sx={{ px: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Tab value="inventory" label="Kho" />
            <Tab value="requests" label="Yêu cầu điều chỉnh" />
          </Tabs>
          {tab === "inventory" ? (
            <Stack spacing={2} sx={{ p: 2 }}>
              <Tabs
                value={categoryTab}
                onChange={(_, value: CategoryTab) => {
                  setCategoryTab(value);
                  setStockPage(0);
                }}
                variant="scrollable"
                scrollButtons="auto"
              >
                {CATEGORY_OPTIONS.map((item) => (
                  <Tab key={item.key} value={item.key} label={item.label} />
                ))}
              </Tabs>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Tìm theo SKU"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setSearchQuery(searchInput.trim());
                      setStockPage(0);
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    label="Trạng thái"
                    value={stockStatusFilter}
                    onChange={(event) => {
                      setStockStatusFilter(event.target.value as StockStatusFilter);
                      setStockPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="Normal">Bình thường</MenuItem>
                    <MenuItem value="LowStock">Sắp hết</MenuItem>
                    <MenuItem value="OutOfStock">Hết hàng</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  sx={{ minWidth: 160 }}
                  placeholder="Mã lô hàng"
                  value={batchCodeInput}
                  onChange={(event) => setBatchCodeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setBatchCodeQuery(batchCodeInput.trim());
                      setStockPage(0);
                    }
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Hạn sử dụng</InputLabel>
                  <Select
                    label="Hạn sử dụng"
                    value={daysUntilExpiryFilter}
                    onChange={(event) => {
                      setDaysUntilExpiryFilter(event.target.value as number | "");
                      setStockPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value={30}>Trong 30 ngày</MenuItem>
                    <MenuItem value={60}>Trong 60 ngày</MenuItem>
                    <MenuItem value={90}>Trong 90 ngày</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    setSearchQuery(searchInput.trim());
                    setBatchCodeQuery(batchCodeInput.trim());
                    setStockPage(0);
                  }}
                >
                  Lọc
                </Button>
              </Stack>

              {stockError ? <Alert severity="error">{stockError}</Alert> : null}

              <TableContainer ref={tableRef} component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: "calc(100vh - 300px)" }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 260, bgcolor: "background.paper", zIndex: 11 }}>Sản phẩm</TableCell>
                      <TableCell sx={{ bgcolor: "background.paper", zIndex: 11 }}>SKU</TableCell>
                      <TableCell align="right" sx={{ bgcolor: "background.paper", zIndex: 11 }}>Khả dụng</TableCell>
                      <TableCell align="right" sx={{ bgcolor: "background.paper", zIndex: 11 }}>Ngưỡng cảnh báo</TableCell>
                      <TableCell sx={{ bgcolor: "background.paper", zIndex: 11 }}>Trạng thái</TableCell>
                      <TableCell align="right" sx={{ bgcolor: "background.paper", zIndex: 11 }}>Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockLoading ? (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell colSpan={6}>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : stocks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>Không có dữ liệu</TableCell>
                      </TableRow>
                    ) : (
                      stocks.map((stock, index) => {
                        const stockKey = getStockKey(stock);
                        const isEven = index % 2 === 0;
                        const groupBg = "white";
                        const batches = stockBatchMap[stockKey] || [];
                        const status = stockChip(stock.status);

                        return (
                          <Fragment key={stockKey}>
                            <TableRow
                              hover
                              sx={{
                                bgcolor: groupBg,
                                borderTop: "16px solid #f1f5f9",
                                "& .MuiTableCell-root": { 
                                  py: 3, 
                                  borderTop: "2px solid #000", // Đường kẻ màu đen rõ rệt
                                  borderBottom: "1px solid", 
                                  borderColor: "divider" 
                                }
                              }}
                            >
                              <TableCell>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Box
                                    sx={{
                                      width: 52,
                                      height: 52,
                                      borderRadius: 2,
                                      overflow: "hidden",
                                      bgcolor: "grey.100",
                                      border: "1px solid",
                                      borderColor: "divider",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {stock.variantImageUrl ? (
                                      <Box
                                        component="img"
                                        src={stock.variantImageUrl}
                                        alt={stock.productName || stock.variantSku}
                                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      />
                                    ) : (
                                      <Stack alignItems="center" justifyContent="center" sx={{ width: "100%", height: "100%" }}>
                                        <InventoryIcon color="disabled" fontSize="small" />
                                      </Stack>
                                    )}
                                  </Box>
                                  <Box>
                                    <Typography fontWeight={700}>{stock.productName || "-"}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {stock.concentrationName || "-"} - {stock.volumeMl ?? 0}ml
                                    </Typography>
                                  </Box>
                                </Stack>
                              </TableCell>
                              <TableCell>{stock.variantSku || "-"}</TableCell>
                              <TableCell align="right">{stock.availableQuantity ?? 0}</TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  cursor: "pointer",
                                  "&:hover": { bgcolor: "action.hover" },
                                  transition: "background-color 0.2s",
                                }}
                                onClick={() => {
                                  if (stock.id && editingStockId !== stock.id) {
                                    setEditingStockId(stock.id);
                                    setEditingThreshold(String(stock.lowStockThreshold || 0));
                                  }
                                }}
                              >
                                 {editingStockId === stock.id ? (
                                   <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                                     <TextField
                                       size="small"
                                       type="number"
                                       value={editingThreshold}
                                       onChange={(e) => setEditingThreshold(e.target.value)}
                                       variant="standard"
                                       InputProps={{
                                         disableUnderline: true,
                                         sx: {
                                           fontSize: "0.875rem",
                                           "& input": { textAlign: "right", p: 0 },
                                         },
                                       }}
                                       sx={{ width: 60 }}
                                       autoFocus
                                       onKeyDown={(e) => {
                                         if (e.key === "Enter" && stock.id) void handleUpdateThreshold(stock.id);
                                         if (e.key === "Escape") setEditingStockId(null);
                                       }}
                                       onBlur={() => setEditingStockId(null)}
                                     />
                                   </Stack>
                                 ) : (
                                   <Typography variant="body2">{stock.lowStockThreshold ?? 0}</Typography>
                                 )}
                              </TableCell>
                              <TableCell>
                                <Chip size="small" color={status.color} label={status.label} />
                              </TableCell>
                              <TableCell align="right" />
                            </TableRow>

                            {stockBatchLoading && batches.length === 0 ? (
                              <TableRow key={`${stockKey}-batch-loading`}>
                                <TableCell colSpan={6} sx={{ pl: 9 }}>
                                  <Skeleton width="45%" />
                                </TableCell>
                              </TableRow>
                            ) : batches.length === 0 ? (
                              <TableRow key={`${stockKey}-empty-batch`}>
                                <TableCell colSpan={6} sx={{ pl: 9, color: "text.secondary" }}>
                                  Chưa có lô hàng cho sản phẩm này
                                </TableCell>
                              </TableRow>
                            ) : (
                              batches.map((batch) => {
                                const expiry = batchExpiryChip(batch);
                                const isBatchExpired = batch.isExpired || (typeof batch.daysUntilExpiry === "number" && batch.daysUntilExpiry < 0);
                                const isOutOfStock = (batch.availableQuantity ?? 0) <= 0;

                                return (
                                  <TableRow
                                    key={batch.id || `${stockKey}-${batch.batchCode}`}
                                    sx={{
                                      bgcolor: isBatchExpired ? "#fff5f5" : "grey.100",
                                      "& .MuiTableCell-root": { py: 1.5, borderBottom: "1px solid white" },
                                      ...(isBatchExpired && { borderLeft: "4px solid #f44336" }),
                                    }}
                                  >
                                    <TableCell sx={{ pl: 9 }}>
                                      <Stack direction="row" spacing={0.5} alignItems="center">
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontFamily: "'Courier New', Courier, monospace",
                                            fontWeight: 900,
                                            color: "text.primary",
                                            letterSpacing: "1px",
                                            fontSize: "1rem",
                                          }}
                                        >
                                          {batch.batchCode || "-"}
                                        </Typography>
                                        <IconButton
                                          size="small"
                                          onClick={() => {
                                            if (batch.batchCode) {
                                              void navigator.clipboard.writeText(batch.batchCode);
                                              showToast("Đã sao chép mã lô", "success");
                                            }
                                          }}
                                          sx={{ p: 0.5 }}
                                        >
                                          <CopyIcon sx={{ fontSize: "0.9rem" }} />
                                        </IconButton>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        SKU: {batch.variantSku || stock.variantSku || "-"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: isOutOfStock ? "error.main" : "inherit", fontWeight: isOutOfStock ? 900 : "inherit" }}>
                                      {batch.availableQuantity ?? 0}
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="caption" display="block">NSX: {formatDate(batch.manufactureDate)}</Typography>
                                      <Typography variant="caption" color="text.secondary" display="block">HSD: {formatDate(batch.expiryDate)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip size="small" variant="outlined" color={expiry.color} label={expiry.label} sx={{ fontWeight: isBatchExpired ? 700 : "inherit" }} />
                                    </TableCell>
                                    <TableCell align="right">
                                      {isAdmin || isStaff ? (
                                        <Button size="small" color="error" onClick={() => openCreateDialog(stock.variantId, batch.id, stock.productName, batch.batchCode)}>
                                          Tạo yêu cầu
                                        </Button>
                                      ) : null}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={stockTotalCount}
                page={stockPage}
                onPageChange={(_, page) => setStockPage(page)}
                rowsPerPage={stockRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setStockRowsPerPage(toInt(event.target.value, 10));
                  setStockPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ p: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    label="Trạng thái"
                    value={requestStatusFilter}
                    onChange={(event) => {
                      setRequestStatusFilter(event.target.value as StockAdjustmentStatus | "");
                      setRequestPage(0);
                    }}
                  >
                    {ADJUSTMENT_STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status || "all"} value={status}>
                        {status ? STATUS_LABELS[status] : "Tất cả"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Lý do</InputLabel>
                  <Select
                    label="Lý do"
                    value={requestReasonFilter}
                    onChange={(event) => {
                      setRequestReasonFilter(event.target.value as StockAdjustmentReason | "");
                      setRequestPage(0);
                    }}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    {ADJUSTMENT_REASON_OPTIONS.map((reason) => (
                      <MenuItem key={reason} value={reason}>
                        {REASON_LABELS[reason]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setRequestStatusFilter("");
                    setRequestReasonFilter("");
                    setRequestPage(0);
                  }}
                >
                  Đặt lại
                </Button>
              </Stack>

              {requestError ? <Alert severity="error">{requestError}</Alert> : null}

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ngày tạo</TableCell>
                      <TableCell>Lý do</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>Người tạo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requestLoading ? (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell colSpan={4}>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>Không có dữ liệu</TableCell>
                      </TableRow>
                    ) : (
                      requests.map((item) => (
                        <TableRow
                          hover
                          key={item.id}
                          onClick={() => void openRequestDetail(item.id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell sx={{ fontWeight: 500 }}>{formatDateTime(item.createdAt || item.adjustmentDate)}</TableCell>
                          <TableCell>{item.reason ? REASON_LABELS[item.reason] : "-"}</TableCell>
                          <TableCell>
                            <Chip size="small" color={requestChip(item.status)} label={item.status ? STATUS_LABELS[item.status] : "-"} />
                          </TableCell>
                          <TableCell>{item.createdByName || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={requestTotalCount}
                page={requestPage}
                onPageChange={(_, page) => setRequestPage(page)}
                rowsPerPage={requestRowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRequestRowsPerPage(toInt(event.target.value, 10));
                  setRequestPage(0);
                }}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </Stack>
          )}
        </Paper>
      </Stack>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>Tạo yêu cầu điều chỉnh tồn kho</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2, border: 1, borderColor: "divider" }}>
              <Typography variant="caption" color="text.secondary" display="block">Sản phẩm điều chỉnh:</Typography>
              <Typography variant="body2" fontWeight={700}>{createPayload.productName || "Không xác định"}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Lô hàng: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{createPayload.batchCode || "-"}</span>
              </Typography>
            </Box>

            <TextField
              label="Số lượng điều chỉnh"
              type="number"
              value={createPayload.adjustmentQuantity}
              onChange={(event) => {
                const val = event.target.value;
                setCreatePayload((prev) => ({ ...prev, adjustmentQuantity: val }));
              }}
              fullWidth
              helperText="Nhập số lượng cần điều chỉnh (có thể nhập số âm để giảm tồn kho)"
            />
            <FormControl fullWidth>
              <InputLabel>Lý do</InputLabel>
              <Select label="Lý do" value={createPayload.reason} onChange={(event) => setCreatePayload((prev) => ({ ...prev, reason: event.target.value as StockAdjustmentReason }))}>
                {ADJUSTMENT_REASON_OPTIONS.map((reason) => <MenuItem key={reason} value={reason}>{REASON_LABELS[reason]}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField multiline minRows={3} label="Ghi chú" value={createPayload.note} onChange={(event) => setCreatePayload((prev) => ({ ...prev, note: event.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>Hủy</Button>
          <LoadingButton loading={createSubmitting} variant="contained" color="error" onClick={handleCreateRequest}>Tạo yêu cầu</LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1 }}>Chi tiết yêu cầu</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {detailLoading ? <Skeleton height={120} /> : !selectedRequest ? <Alert severity="warning">Không có dữ liệu</Alert> : (
            <Stack spacing={2.5}>
              {/* Header Info */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: 1, borderColor: "divider", pb: 2 }}>
                <Stack spacing={1}>
                  <Chip
                    label={STATUS_LABELS[selectedRequest.status || "Pending"]}
                    color={requestChip(selectedRequest.status)}
                    size="small"
                    sx={{ fontWeight: 700, px: 1 }}
                  />
                  <Typography variant="h6" fontWeight={700}>
                    {selectedRequest.reason ? REASON_LABELS[selectedRequest.reason] : "Điều chỉnh tồn kho"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Người tạo: <strong>{selectedRequest.createdByName || "Hệ thống"}</strong>
                  </Typography>
                </Stack>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary" display="block">Ngày tạo</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatDateTime(selectedRequest.createdAt || selectedRequest.adjustmentDate)}
                  </Typography>
                </Box>
              </Box>

              {/* Adjustment Items Table */}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: "grey.50" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Sản phẩm / SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Lô hàng</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Yêu cầu</TableCell>
                      {selectedRequest.status !== "Pending" && (
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Đã duyệt</TableCell>
                      )}
                      {selectedRequest.status === "InProgress" && (
                        <TableCell sx={{ fontWeight: 700 }}>Duyệt số lượng</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedRequest.adjustmentDetails || []).map((detail) => (
                      <TableRow key={detail.id || detail.batchId || detail.productVariantId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>{detail.productName || "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">{detail.variantSku || "-"}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>{detail.batchCode || "-"}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="error.main" fontWeight={700}>{detail.adjustmentQuantity ?? 0}</Typography>
                        </TableCell>
                        {selectedRequest.status !== "Pending" && (
                          <TableCell align="right">
                            <Typography variant="body2" color="success.main" fontWeight={700}>{detail.approvedQuantity ?? 0}</Typography>
                          </TableCell>
                        )}
                        {selectedRequest.status === "InProgress" && detail.id ? (
                          <TableCell>
                            <Stack spacing={1} sx={{ py: 1 }}>
                              <TextField
                                size="small"
                                type="number"
                                placeholder="Số lượng"
                                value={verifyDrafts.find((item) => item.detailId === detail.id)?.approvedQuantity || ""}
                                onChange={(event) =>
                                  setVerifyDrafts((prev) =>
                                    prev.map((item) =>
                                      item.detailId === detail.id ? { ...item, approvedQuantity: event.target.value } : item
                                    )
                                  )
                                }
                                sx={{ width: 100 }}
                              />
                              <TextField
                                size="small"
                                placeholder="Ghi chú"
                                value={verifyDrafts.find((item) => item.detailId === detail.id)?.note || ""}
                                onChange={(event) =>
                                  setVerifyDrafts((prev) =>
                                    prev.map((item) =>
                                      item.detailId === detail.id ? { ...item, note: event.target.value } : item
                                    )
                                  )
                                }
                                fullWidth
                              />
                            </Stack>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {selectedRequest.note && (
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2, borderLeft: 4, borderColor: "primary.main" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, display: "block" }}>Ghi chú yêu cầu:</Typography>
                  <Typography variant="body2">{selectedRequest.note}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedRequest?.status === "Pending" && (isAdmin || isStaff) ? <LoadingButton loading={detailSubmitting} variant="outlined" color="warning" onClick={() => void handleUpdateRequestStatus("InProgress")}>Chuyển xử lý</LoadingButton> : null}
          {selectedRequest?.status === "InProgress" && (isAdmin || isStaff) ? <LoadingButton loading={detailSubmitting} variant="contained" color="success" onClick={handleVerifyRequest}>Duyệt yêu cầu</LoadingButton> : null}
          <Button onClick={() => setDetailDialogOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
