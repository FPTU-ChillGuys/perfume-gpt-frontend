import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Inventory2 as InventoryIcon,
  WarningAmber as WarningIcon,
  Layers as LayersIcon,
  PendingActions as PendingIcon,
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
  Damage: "H\u01b0 h\u1ea1i",
  Expired: "H\u1ebft h\u1ea1n",
  Theft: "Th\u1ea5t tho\u00e1t",
  Loss: "M\u1ea5t m\u00e1t",
  Found: "T\u00ecm th\u1ea5y",
  Correction: "\u0110i\u1ec1u ch\u1ec9nh",
  Return: "Ho\u00e0n tr\u1ea3",
  Other: "Kh\u00e1c",
};

const STATUS_LABELS: Record<StockAdjustmentStatus, string> = {
  Pending: "Ch\u1edd duy\u1ec7t",
  InProgress: "\u0110ang x\u1eed l\u00fd",
  Completed: "Ho\u00e0n th\u00e0nh",
  Cancelled: "\u0110\u00e3 h\u1ee7y",
};

const CATEGORY_OPTIONS: Array<{ key: CategoryTab; label: string; id?: number }> = [
  { key: "all", label: "T\u1ea5t c\u1ea3" },
  { key: "women", label: "N\u01b0\u1edbc hoa n\u1eef", id: 1 },
  { key: "men", label: "N\u01b0\u1edbc hoa nam", id: 2 },
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
  if (status === "OutOfStock") return { label: "H\u1ebft h\u00e0ng", color: "error" as const };
  if (status === "LowStock") return { label: "S\u1eafp h\u1ebft", color: "warning" as const };
  return { label: "B\u00ecnh th\u01b0\u1eddng", color: "success" as const };
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
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const toInt = (value: string, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getStockKey = (stock: StockResponse) => stock.variantId || stock.id || stock.variantSku;

const batchExpiryChip = (batch: BatchDetailResponse) => {
  if (batch.isExpired || (typeof batch.daysUntilExpiry === "number" && batch.daysUntilExpiry < 0)) {
    return { label: "\u0110\u00e3 h\u1ebft h\u1ea1n", color: "error" as const };
  }
  if (typeof batch.daysUntilExpiry === "number") {
    if (batch.daysUntilExpiry <= 30) return { label: `C\u00f2n ${batch.daysUntilExpiry} ng\u00e0y`, color: "warning" as const };
    return { label: `C\u00f2n ${batch.daysUntilExpiry} ng\u00e0y`, color: "success" as const };
  }
  return { label: "\u0110ang b\u00e1n", color: "success" as const };
};

export const InventoryManagementPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

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
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [requests, setRequests] = useState<StockAdjustmentResponse[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestPage, setRequestPage] = useState(0);
  const [requestRowsPerPage, setRequestRowsPerPage] = useState(10);
  const [requestTotalCount, setRequestTotalCount] = useState(0);
  const [requestStatusFilter, setRequestStatusFilter] = useState<StockAdjustmentStatus | "">("");
  const [requestReasonFilter, setRequestReasonFilter] = useState<StockAdjustmentReason | "">("");

  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchDetailResponse[]>([]);
  const [batchVariantId, setBatchVariantId] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createPayload, setCreatePayload] = useState({
    variantId: "",
    batchId: "",
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
      showToast(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 t\u1ea3i t\u1ed5ng quan", "error");
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
    } catch (error) {
      setStockError(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 t\u1ea3i t\u1ed3n kho");
    } finally {
      setStockLoading(false);
      setStockBatchLoading(false);
    }
  }, [categoryTab, searchQuery, stockPage, stockRowsPerPage, stockStatusFilter]);

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
      setRequestError(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch y\u00eau c\u1ea7u");
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
      { label: "T\u1ed5ng bi\u1ebfn th\u1ec3", value: summary?.totalVariants ?? 0, icon: <InventoryIcon color="primary" fontSize="small" /> },
      { label: "S\u1eafp h\u1ebft h\u00e0ng", value: summary?.lowStockVariantsCount ?? 0, icon: <WarningIcon color="warning" fontSize="small" /> },
      { label: "T\u1ed5ng l\u00f4 h\u00e0ng", value: summary?.totalBatches ?? 0, icon: <LayersIcon color="info" fontSize="small" /> },
      { label: "Y\u00eau c\u1ea7u ch\u1edd duy\u1ec7t", value: requests.filter((item) => item.status === "Pending").length, icon: <PendingIcon color="warning" fontSize="small" /> },
    ],
    [requests, summary],
  );

  const openBatchDialog = async (variantId?: string) => {
    if (!variantId) return;
    setBatchVariantId(variantId);
    setBatchDialogOpen(true);
    try {
      setBatchLoading(true);
      setBatchItems(await inventoryService.getBatchesByVariant(variantId));
    } catch (error) {
      setBatchItems([]);
      showToast(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 t\u1ea3i l\u00f4 h\u00e0ng", "error");
    } finally {
      setBatchLoading(false);
    }
  };

  const openCreateDialog = (variantId?: string, batchId?: string) => {
    setCreatePayload({ variantId: variantId || "", batchId: batchId || "", adjustmentQuantity: "1", reason: "Damage", note: "" });
    setCreateDialogOpen(true);
  };

  const handleCreateRequest = async () => {
    const quantity = toInt(createPayload.adjustmentQuantity, 0);
    if (!createPayload.variantId.trim() || !createPayload.batchId.trim() || quantity <= 0) {
      showToast("M\u00e3 bi\u1ebfn th\u1ec3, m\u00e3 l\u00f4 h\u00e0ng v\u00e0 s\u1ed1 l\u01b0\u1ee3ng ph\u1ea3i h\u1ee3p l\u1ec7", "warning");
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
      showToast("T\u1ea1o y\u00eau c\u1ea7u th\u00e0nh c\u00f4ng", "success");
      if (tab === "requests") void loadRequests();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 t\u1ea1o y\u00eau c\u1ea7u", "error");
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
      showToast(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 t\u1ea3i chi ti\u1ebft", "error");
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
      showToast(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i", "error");
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
      showToast(error instanceof Error ? error.message : "Kh\u00f4ng th\u1ec3 duy\u1ec7t y\u00eau c\u1ea7u", "error");
    } finally {
      setDetailSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <Stack spacing={2.5}>
        <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="h5" fontWeight={700}>{"Qu\u1ea3n l\u00fd t\u1ed3n kho 2.0"}</Typography>
              <Typography color="text.secondary">{"C\u1eeda s\u1ed5 thao t\u00e1c \u0111\u1eb9p h\u01a1n, m\u00e0u s\u1eafc r\u00f5 h\u01a1n v\u00e0 d\u1ec5 s\u1eed d\u1ee5ng h\u01a1n."}</Typography>
            </Box>
            <Button variant="outlined" color="error" startIcon={<RefreshIcon />} onClick={() => { void loadSummary(); if (tab === "inventory") void loadStocks(); if (tab === "requests") void loadRequests(); }}>
              {"L\u00e0m m\u1edbi"}
            </Button>
          </Stack>
        </Paper>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" }, gap: 2 }}>
          {cards.map((card) => (
            <Card key={card.label} sx={{ borderRadius: 2.5, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                  {card.icon}
                </Stack>
                {summaryLoading ? <Skeleton sx={{ mt: 1 }} width={80} /> : <Typography variant="h4" fontWeight={700}>{new Intl.NumberFormat("vi-VN").format(card.value)}</Typography>}
              </CardContent>
            </Card>
          ))}
        </Box>

        <Paper sx={{ borderRadius: 2.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
          <Tabs value={tab} onChange={(_, value: InventoryTab) => setTab(value)} sx={{ px: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Tab value="inventory" label={"T\u1ed3n kho"} />
            <Tab value="requests" label={"Y\u00eau c\u1ea7u \u0111i\u1ec1u ch\u1ec9nh"} />
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
                  placeholder={"T\u00ecm theo SKU"}
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
                  <InputLabel>{"Tr\u1ea1ng th\u00e1i"}</InputLabel>
                  <Select
                    label={"Tr\u1ea1ng th\u00e1i"}
                    value={stockStatusFilter}
                    onChange={(event) => {
                      setStockStatusFilter(event.target.value as StockStatusFilter);
                      setStockPage(0);
                    }}
                  >
                    <MenuItem value="">{"T\u1ea5t c\u1ea3"}</MenuItem>
                    <MenuItem value="Normal">{"B\u00ecnh th\u01b0\u1eddng"}</MenuItem>
                    <MenuItem value="LowStock">{"S\u1eafp h\u1ebft"}</MenuItem>
                    <MenuItem value="OutOfStock">{"H\u1ebft h\u00e0ng"}</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    setSearchQuery(searchInput.trim());
                    setStockPage(0);
                  }}
                >
                  {"L\u1ecdc"}
                </Button>
              </Stack>

              {stockError ? <Alert severity="error">{stockError}</Alert> : null}

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 260 }}>{"S\u1ea3n ph\u1ea9m"}</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>{"M\u00e3 t\u1ed3n kho / L\u00f4 h\u00e0ng"}</TableCell>
                      <TableCell>{"Dung t\u00edch / N\u1ed3ng \u0111\u1ed9"}</TableCell>
                      <TableCell align="right">{"T\u1ed5ng / Nh\u1eadp"}</TableCell>
                      <TableCell align="right">{"Kh\u1ea3 d\u1ee5ng"}</TableCell>
                      <TableCell align="right">{"Ng\u01b0\u1ee1ng / C\u00f2n l\u1ea1i"}</TableCell>
                      <TableCell>{"Ng\u00e0y s\u1ea3n xu\u1ea5t / H\u1ea1n d\u00f9ng"}</TableCell>
                      <TableCell>{"Tr\u1ea1ng th\u00e1i"}</TableCell>
                      <TableCell align="right">{"Thao t\u00e1c"}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stockLoading ? (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell colSpan={10}>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : stocks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10}>{"Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u"}</TableCell>
                      </TableRow>
                    ) : (
                      stocks.map((stock) => {
                        const stockKey = getStockKey(stock);
                        const batches = stockBatchMap[stockKey] || [];
                        const status = stockChip(stock.status);

                        return (
                          <Fragment key={stockKey}>
                            <TableRow hover sx={{ bgcolor: "grey.50" }}>
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
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {stock.id || stock.variantId || "-"}
                                </Typography>
                              </TableCell>
                              <TableCell>{stock.volumeMl ?? 0}ml / {stock.concentrationName || "-"}</TableCell>
                              <TableCell align="right">{stock.totalQuantity ?? 0}</TableCell>
                              <TableCell align="right">{stock.availableQuantity ?? 0}</TableCell>
                              <TableCell align="right">{stock.lowStockThreshold ?? 0}</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>
                                <Chip size="small" color={status.color} label={status.label} />
                              </TableCell>
                              <TableCell align="right">
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Button size="small" onClick={() => void openBatchDialog(stock.variantId)}>
                                    {"Xem l\u00f4"}
                                  </Button>
                                  {isAdmin || isStaff ? (
                                    <Button size="small" color="error" onClick={() => openCreateDialog(stock.variantId)}>
                                      {"T\u1ea1o y\u00eau c\u1ea7u"}
                                    </Button>
                                  ) : null}
                                </Stack>
                              </TableCell>
                            </TableRow>

                            {stockBatchLoading && batches.length === 0 ? (
                              <TableRow key={`${stockKey}-batch-loading`}>
                                <TableCell colSpan={10} sx={{ pl: 9 }}>
                                  <Skeleton width="45%" />
                                </TableCell>
                              </TableRow>
                            ) : batches.length === 0 ? (
                              <TableRow key={`${stockKey}-empty-batch`}>
                                <TableCell colSpan={10} sx={{ pl: 9, color: "text.secondary" }}>
                                  {"Ch\u01b0a c\u00f3 l\u00f4 h\u00e0ng cho s\u1ea3n ph\u1ea9m n\u00e0y"}
                                </TableCell>
                              </TableRow>
                            ) : (
                              batches.map((batch) => {
                                const expiry = batchExpiryChip(batch);
                                return (
                                  <TableRow key={batch.id || `${stockKey}-${batch.batchCode}`}>
                                    <TableCell sx={{ pl: 9 }}>
                                      <Chip size="small" variant="outlined" label="Batch" />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {"L\u00f4 c\u1ee7a SKU"} {batch.variantSku || stock.variantSku || "-"}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>{batch.batchCode || "-"}</TableCell>
                                    <TableCell>{batch.volumeMl ?? stock.volumeMl ?? 0}ml / {batch.concentrationName || stock.concentrationName || "-"}</TableCell>
                                    <TableCell align="right">{batch.importQuantity ?? 0}</TableCell>
                                    <TableCell align="right">{batch.availableQuantity ?? 0}</TableCell>
                                    <TableCell align="right">{batch.remainingQuantity ?? 0}</TableCell>
                                    <TableCell>
                                      <Typography variant="caption" display="block">NSX: {formatDate(batch.manufactureDate)}</Typography>
                                      <Typography variant="caption" color="text.secondary" display="block">HSD: {formatDate(batch.expiryDate)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip size="small" variant="outlined" color={expiry.color} label={expiry.label} />
                                    </TableCell>
                                    <TableCell align="right">
                                      {isAdmin || isStaff ? (
                                        <Button size="small" color="error" onClick={() => openCreateDialog(stock.variantId, batch.id)}>
                                          {"T\u1ea1o y\u00eau c\u1ea7u"}
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
                  <InputLabel>{"Tr\u1ea1ng th\u00e1i"}</InputLabel>
                  <Select
                    label={"Tr\u1ea1ng th\u00e1i"}
                    value={requestStatusFilter}
                    onChange={(event) => {
                      setRequestStatusFilter(event.target.value as StockAdjustmentStatus | "");
                      setRequestPage(0);
                    }}
                  >
                    {ADJUSTMENT_STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status || "all"} value={status}>
                        {status ? STATUS_LABELS[status] : "T\u1ea5t c\u1ea3"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>{"L\u00fd do"}</InputLabel>
                  <Select
                    label={"L\u00fd do"}
                    value={requestReasonFilter}
                    onChange={(event) => {
                      setRequestReasonFilter(event.target.value as StockAdjustmentReason | "");
                      setRequestPage(0);
                    }}
                  >
                    <MenuItem value="">{"T\u1ea5t c\u1ea3"}</MenuItem>
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
                  {"\u0110\u1eb7t l\u1ea1i"}
                </Button>
              </Stack>

              {requestError ? <Alert severity="error">{requestError}</Alert> : null}

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{"M\u00e3 y\u00eau c\u1ea7u"}</TableCell>
                      <TableCell>{"L\u00fd do"}</TableCell>
                      <TableCell>{"Tr\u1ea1ng th\u00e1i"}</TableCell>
                      <TableCell>{"Ng\u01b0\u1eddi t\u1ea1o"}</TableCell>
                      <TableCell align="right">{"S\u1ed1 d\u00f2ng"}</TableCell>
                      <TableCell>{"Ng\u00e0y t\u1ea1o"}</TableCell>
                      <TableCell align="right">{"Thao t\u00e1c"}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requestLoading ? (
                      Array.from({ length: 8 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell colSpan={7}>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>{"Ch\u01b0a c\u00f3 y\u00eau c\u1ea7u"}</TableCell>
                      </TableRow>
                    ) : (
                      requests.map((item) => (
                        <TableRow hover key={item.id}>
                          <TableCell>{item.id || "-"}</TableCell>
                          <TableCell>{item.reason ? REASON_LABELS[item.reason] : "-"}</TableCell>
                          <TableCell>
                            <Chip size="small" color={requestChip(item.status)} label={item.status ? STATUS_LABELS[item.status] : "-"} />
                          </TableCell>
                          <TableCell>{item.createdByName || "-"}</TableCell>
                          <TableCell align="right">{item.adjustmentDetails?.length ?? 0}</TableCell>
                          <TableCell>{formatDateTime(item.createdAt || item.adjustmentDate)}</TableCell>
                          <TableCell align="right">
                            <Button size="small" onClick={() => void openRequestDetail(item.id)}>
                              {"Chi ti\u1ebft"}
                            </Button>
                          </TableCell>
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

      <Dialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1 }}>{"Danh s\u00e1ch l\u00f4 h\u00e0ng"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {batchLoading ? <Skeleton height={80} /> : batchItems.length === 0 ? <Alert severity="info">{"Kh\u00f4ng c\u00f3 l\u00f4 h\u00e0ng cho bi\u1ebfn th\u1ec3 n\u00e0y"}</Alert> : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{"M\u00e3 l\u00f4 h\u00e0ng"}</TableCell>
                    <TableCell align="right">{"Nh\u1eadp"}</TableCell>
                    <TableCell align="right">{"C\u00f2n l\u1ea1i"}</TableCell>
                    <TableCell align="right">{"Kh\u1ea3 d\u1ee5ng"}</TableCell>
                    <TableCell>HSD</TableCell>
                    <TableCell align="right">{"Thao t\u00e1c"}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {batchItems.map((item) => (
                    <TableRow key={item.id || item.batchCode}>
                      <TableCell>{item.batchCode || "-"}</TableCell>
                      <TableCell align="right">{item.importQuantity ?? 0}</TableCell>
                      <TableCell align="right">{item.remainingQuantity ?? 0}</TableCell>
                      <TableCell align="right">{item.availableQuantity ?? 0}</TableCell>
                      <TableCell>{formatDateTime(item.expiryDate)}</TableCell>
                      <TableCell align="right">
                        {isAdmin || isStaff ? (
                          <Button size="small" color="error" onClick={() => { openCreateDialog(batchVariantId, item.id); setBatchDialogOpen(false); }}>
                            {"T\u1ea1o y\u00eau c\u1ea7u"}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchDialogOpen(false)}>{"\u0110\u00f3ng"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1 }}>{"T\u1ea1o y\u00eau c\u1ea7u \u0111i\u1ec1u ch\u1ec9nh t\u1ed3n kho"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={1.5}>
            <TextField label={"M\u00e3 bi\u1ebfn th\u1ec3"} value={createPayload.variantId} onChange={(event) => setCreatePayload((prev) => ({ ...prev, variantId: event.target.value }))} fullWidth />
            <TextField label={"M\u00e3 l\u00f4 h\u00e0ng"} value={createPayload.batchId} onChange={(event) => setCreatePayload((prev) => ({ ...prev, batchId: event.target.value }))} fullWidth />
            <TextField label={"S\u1ed1 l\u01b0\u1ee3ng"} type="number" value={createPayload.adjustmentQuantity} onChange={(event) => setCreatePayload((prev) => ({ ...prev, adjustmentQuantity: event.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>{"L\u00fd do"}</InputLabel>
              <Select label={"L\u00fd do"} value={createPayload.reason} onChange={(event) => setCreatePayload((prev) => ({ ...prev, reason: event.target.value as StockAdjustmentReason }))}>
                {ADJUSTMENT_REASON_OPTIONS.map((reason) => <MenuItem key={reason} value={reason}>{REASON_LABELS[reason]}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField multiline minRows={3} label={"Ghi ch\u00fa"} value={createPayload.note} onChange={(event) => setCreatePayload((prev) => ({ ...prev, note: event.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)}>{"H\u1ee7y"}</Button>
          <LoadingButton loading={createSubmitting} variant="contained" color="error" onClick={handleCreateRequest}>{"T\u1ea1o y\u00eau c\u1ea7u"}</LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ pb: 1 }}>{"Chi ti\u1ebft y\u00eau c\u1ea7u"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {detailLoading ? <Skeleton height={120} /> : !selectedRequest ? <Alert severity="warning">{"Kh\u00f4ng c\u00f3 d\u1eef li\u1ec7u"}</Alert> : (
            <Stack spacing={1.5}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "grey.50" }}>
                <Typography variant="subtitle2">{"M\u00e3"}: {selectedRequest.id || "-"}</Typography>
                <Typography variant="body2" color="text.secondary">{"L\u00fd do"}: {selectedRequest.reason ? REASON_LABELS[selectedRequest.reason] : "-"} | {"Tr\u1ea1ng th\u00e1i"}: {selectedRequest.status ? STATUS_LABELS[selectedRequest.status] : "-"}</Typography>
                <Typography variant="body2" color="text.secondary">{"Ng\u00e0y t\u1ea1o"}: {formatDateTime(selectedRequest.createdAt || selectedRequest.adjustmentDate)}</Typography>
              </Paper>
              {(selectedRequest.adjustmentDetails || []).map((detail) => (
                <Paper key={detail.id || detail.batchId || detail.productVariantId} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">SKU: {detail.variantSku || "-"} | {"L\u00f4 h\u00e0ng"}: {detail.batchCode || "-"}</Typography>
                    <Typography variant="body2" color="text.secondary">{"Y\u00eau c\u1ea7u"}: {detail.adjustmentQuantity ?? 0} | {"\u0110\u00e3 duy\u1ec7t"}: {detail.approvedQuantity ?? 0}</Typography>
                    {selectedRequest.status === "InProgress" && detail.id ? (
                      <>
                        <Divider />
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                          <TextField size="small" type="number" label={"S\u1ed1 l\u01b0\u1ee3ng duy\u1ec7t"} value={verifyDrafts.find((item) => item.detailId === detail.id)?.approvedQuantity || "0"} onChange={(event) => setVerifyDrafts((prev) => prev.map((item) => item.detailId === detail.id ? { ...item, approvedQuantity: event.target.value } : item))} />
                          <TextField size="small" fullWidth label={"Ghi ch\u00fa duy\u1ec7t"} value={verifyDrafts.find((item) => item.detailId === detail.id)?.note || ""} onChange={(event) => setVerifyDrafts((prev) => prev.map((item) => item.detailId === detail.id ? { ...item, note: event.target.value } : item))} />
                        </Stack>
                      </>
                    ) : null}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {selectedRequest?.status === "Pending" && (isAdmin || isStaff) ? <LoadingButton loading={detailSubmitting} variant="outlined" color="warning" onClick={() => void handleUpdateRequestStatus("InProgress")}>{"Chuy\u1ec3n x\u1eed l\u00fd"}</LoadingButton> : null}
          {selectedRequest?.status === "InProgress" && (isAdmin || isStaff) ? <LoadingButton loading={detailSubmitting} variant="contained" color="success" onClick={handleVerifyRequest}>{"Duy\u1ec7t y\u00eau c\u1ea7u"}</LoadingButton> : null}
          <Button onClick={() => setDetailDialogOpen(false)}>{"\u0110\u00f3ng"}</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};
