import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Clear as ClearIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useToast } from "@/hooks/useToast";
import {
  inventoryService,
  type BatchDetailResponse,
  type StockResponse,
} from "@/services/inventoryService";
import { productService } from "@/services/productService";
import { BulkConfigModal, type BulkConfigValues } from "./BulkConfigModal";

// ─── Shared types ───────────────────────────────────────────────────
type CampaignCategoryTab =
  | "all"
  | "men"
  | "women"
  | "unisex"
  | "niche"
  | "giftset";

type StockStatusFilter = NonNullable<StockResponse["status"]> | "";
type ExpiryDaysFilter = "" | "30" | "60" | "90";

type CachedBatchState = {
  items: BatchDetailResponse[];
  loading: boolean;
  error: string | null;
};

/** A selectable row – can be a variant row or a batch sub-row. */
export type SelectableRow = {
  /** Unique key: `${variantId}-all` for variant, `${variantId}-${batchId}` for batch */
  key: string;
  productVariantId: string;
  batchId: string | null;
  productName: string;
  variantSku: string;
  variantImageUrl: string | null | undefined;
  batchCode: string | null;
  availableQuantity: number;
  basePrice: number | null;
  retailPrice: number | null;
};

export type SelectedCampaignItem = SelectableRow & {
  promotionType: import("@/services/campaignService").PromotionType;
  discountType: import("@/services/campaignService").DiscountType;
  discountValueInput: string;
  maxUsageInput: string;
};

// ─── Constants ──────────────────────────────────────────────────────
const CATEGORY_TABS: Array<{ key: CampaignCategoryTab; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "men", label: "Nước hoa Nam" },
  { key: "women", label: "Nước hoa Nữ" },
  { key: "unisex", label: "Unisex" },
  { key: "niche", label: "Niche" },
  { key: "giftset", label: "Giftset" },
];

const CATEGORY_ID_MAP: Record<Exclude<CampaignCategoryTab, "all">, number> = {
  women: 1,
  men: 2,
  unisex: 3,
  niche: 4,
  giftset: 5,
};

const EXPIRY_FILTER_OPTIONS: Array<{ value: ExpiryDaysFilter; label: string }> =
  [
    { value: "", label: "Tất cả hạn dùng" },
    { value: "30", label: "Sắp hết hạn <= 30 ngày" },
    { value: "60", label: "Sắp hết hạn <= 60 ngày" },
    { value: "90", label: "Sắp hết hạn <= 90 ngày" },
  ];

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  date.setHours(date.getHours() + 7);
  return date.toLocaleDateString("vi-VN");
};

const getStockStatusDisplay = (stock: StockResponse) => {
  if (stock.status === "OutOfStock")
    return { label: "Hết hàng", color: "error" as const };
  if (stock.status === "LowStock")
    return { label: "Sắp hết", color: "warning" as const };
  return { label: "Bình thường", color: "success" as const };
};

// ─── Props ──────────────────────────────────────────────────────────
type BulkItemSelectorProps = {
  selectedItems: SelectedCampaignItem[];
  onSelectedItemsChange: (items: SelectedCampaignItem[]) => void;
};

export const BulkItemSelector = ({
  selectedItems,
  onSelectedItemsChange,
}: BulkItemSelectorProps) => {
  const { showToast } = useToast();

  // ── Stock list state ──
  const [stockList, setStockList] = useState<StockResponse[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [stockPage, setStockPage] = useState(0);
  const [stockRowsPerPage, setStockRowsPerPage] = useState(10);
  const [stockTotalCount, setStockTotalCount] = useState(0);
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [stockSearchValue, setStockSearchValue] = useState("");
  const [stockStatusFilter, setStockStatusFilter] =
    useState<StockStatusFilter>("");
  const [expiryDaysFilter, setExpiryDaysFilter] =
    useState<ExpiryDaysFilter>("");
  const [selectedCategoryTab, setSelectedCategoryTab] =
    useState<CampaignCategoryTab>("all");

  // ── Batch & price caches ──
  const [batchByVariantId, setBatchByVariantId] = useState<
    Record<string, CachedBatchState>
  >({});
  const [variantPricesCache, setVariantPricesCache] = useState<
    Record<string, { basePrice: number | null; retailPrice: number | null }>
  >({});
  const loadedPriceVariantIds = useRef<Set<string>>(new Set());

  // ── Checkbox state ──
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Cross-page cache: accumulates all SelectableRow data the user has seen
  const allRowsCache = useRef<Map<string, SelectableRow>>(new Map());

  // ── Data loaders ──
  const loadStocks = useCallback(async () => {
    const categoryId =
      selectedCategoryTab === "all"
        ? undefined
        : CATEGORY_ID_MAP[selectedCategoryTab];

    try {
      setStockLoading(true);
      setStockError(null);

      const baseQuery: {
        CategoryId?: number;
        StockStatus?: NonNullable<StockResponse["status"]>;
        DaysUntilExpiry?: number;
        PageNumber: number;
        PageSize: number;
        SortBy: string;
        SortOrder: string;
      } = {
        PageNumber: stockPage + 1,
        PageSize: stockRowsPerPage,
        SortBy: "ProductName",
        SortOrder: "asc",
      };

      if (stockStatusFilter) baseQuery.StockStatus = stockStatusFilter;
      if (categoryId) baseQuery.CategoryId = categoryId;
      if (expiryDaysFilter)
        baseQuery.DaysUntilExpiry = Number(expiryDaysFilter);

      const normalizedSearch = stockSearchValue.trim();

      if (!normalizedSearch) {
        const response = await inventoryService.getStock(baseQuery);
        setStockList(response.items || []);
        setStockTotalCount(response.totalCount || 0);
        return;
      }

      const bySku = await inventoryService.getStock({
        ...baseQuery,
        SKU: normalizedSearch,
      });
      if ((bySku.items || []).length > 0) {
        setStockList(bySku.items || []);
        setStockTotalCount(bySku.totalCount || 0);
        return;
      }

      const byBatchCode = await inventoryService.getStock({
        ...baseQuery,
        BatchCode: normalizedSearch,
      });
      setStockList(byBatchCode.items || []);
      setStockTotalCount(byBatchCode.totalCount || 0);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách tồn kho";
      setStockError(message);
      showToast(message, "error");
    } finally {
      setStockLoading(false);
    }
  }, [
    expiryDaysFilter,
    selectedCategoryTab,
    showToast,
    stockPage,
    stockRowsPerPage,
    stockSearchValue,
    stockStatusFilter,
  ]);

  useEffect(() => {
    void loadStocks();
  }, [loadStocks]);

  // Load variant prices
  useEffect(() => {
    if (stockList.length === 0) return;
    const variantIds = stockList
      .map((s) => s.variantId)
      .filter((id): id is string => Boolean(id))
      .filter((id) => !loadedPriceVariantIds.current.has(id));
    if (variantIds.length === 0) return;
    variantIds.forEach((id) => loadedPriceVariantIds.current.add(id));

    const loadPrices = async () => {
      const results = await Promise.all(
        variantIds.map(async (variantId) => {
          try {
            const variant = await productService.getVariantById(variantId);
            return {
              variantId,
              basePrice: variant.basePrice ?? null,
              retailPrice: variant.retailPrice ?? null,
            };
          } catch {
            return { variantId, basePrice: null, retailPrice: null };
          }
        }),
      );
      setVariantPricesCache((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.variantId] = {
            basePrice: r.basePrice,
            retailPrice: r.retailPrice,
          };
        });
        return next;
      });
    };
    void loadPrices();
  }, [stockList]);

  // Debounce search
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = stockSearchInput.trim();
      setStockSearchValue((cur) => (cur === normalized ? cur : normalized));
      setStockPage((cur) => (cur === 0 ? cur : 0));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [stockSearchInput]);

  // Load batches for visible variants
  const loadBatchesByVariantId = useCallback(async (variantId: string) => {
    setBatchByVariantId((cur) => ({
      ...cur,
      [variantId]: {
        items: cur[variantId]?.items || [],
        loading: true,
        error: null,
      },
    }));
    try {
      const response = await inventoryService.getBatchesByVariant(variantId);
      setBatchByVariantId((cur) => ({
        ...cur,
        [variantId]: { items: response, loading: false, error: null },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải danh sách lô";
      setBatchByVariantId((cur) => ({
        ...cur,
        [variantId]: { items: [], loading: false, error: message },
      }));
    }
  }, []);

  useEffect(() => {
    if (stockLoading) return;
    const visibleVariantIds = stockList
      .map((s) => s.variantId)
      .filter((id): id is string => Boolean(id));
    visibleVariantIds.forEach((id) => {
      if (!batchByVariantId[id]) void loadBatchesByVariantId(id);
    });
  }, [batchByVariantId, loadBatchesByVariantId, stockList, stockLoading]);

  // ── Build all selectable rows from visible stock + batches ──
  const selectableRows = useMemo(() => {
    const rows: SelectableRow[] = [];
    for (const stock of stockList) {
      const variantId = stock.variantId || "";
      if (!variantId) continue;
      const cached = variantPricesCache[variantId];

      // Variant-level row
      rows.push({
        key: `${variantId}-all`,
        productVariantId: variantId,
        batchId: null,
        productName: stock.productName || "N/A",
        variantSku: stock.variantSku || "N/A",
        variantImageUrl: stock.variantImageUrl,
        batchCode: null,
        availableQuantity: stock.availableQuantity ?? 0,
        basePrice: cached?.basePrice ?? null,
        retailPrice: cached?.retailPrice ?? null,
      });

      // Batch-level rows
      const batches = batchByVariantId[variantId]?.items || [];
      for (const batch of batches) {
        if (!batch.id) continue;
        rows.push({
          key: `${variantId}-${batch.id}`,
          productVariantId: variantId,
          batchId: batch.id,
          productName: stock.productName || batch.productName || "N/A",
          variantSku: stock.variantSku || batch.variantSku || "N/A",
          variantImageUrl: stock.variantImageUrl,
          batchCode: batch.batchCode || "N/A",
          availableQuantity: batch.remainingQuantity ?? 0,
          basePrice: cached?.basePrice ?? null,
          retailPrice: cached?.retailPrice ?? null,
        });
      }
    }
    return rows;
  }, [stockList, batchByVariantId, variantPricesCache]);

  // Update cross-page row cache whenever selectableRows changes
  useEffect(() => {
    for (const row of selectableRows) {
      allRowsCache.current.set(row.key, row);
    }
  }, [selectableRows]);

  // Keys that are already in selectedItems (so we can mark them as already added)
  const alreadyAddedKeys = useMemo(
    () => new Set(selectedItems.map((item) => item.key)),
    [selectedItems],
  );

  // ── Checkbox helpers ──
  const availableKeys = useMemo(
    () =>
      selectableRows
        .filter((r) => !alreadyAddedKeys.has(r.key))
        .map((r) => r.key),
    [selectableRows, alreadyAddedKeys],
  );

  // Only variant-level (non-batch) keys for the "select all" header checkbox
  const availableVariantKeys = useMemo(
    () =>
      selectableRows
        .filter((r) => !r.batchId && !alreadyAddedKeys.has(r.key))
        .map((r) => r.key),
    [selectableRows, alreadyAddedKeys],
  );

  const allChecked =
    availableVariantKeys.length > 0 &&
    availableVariantKeys.every((k) => checkedKeys.has(k));
  const someChecked = availableKeys.some((k) => checkedKeys.has(k));

  const handleToggleAll = () => {
    if (allChecked) {
      setCheckedKeys((prev) => {
        const next = new Set(prev);
        for (const k of availableVariantKeys) next.delete(k);
        return next;
      });
    } else {
      setCheckedKeys((prev) => new Set([...prev, ...availableVariantKeys]));
    }
  };

  const handleToggleRow = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const checkedCount = checkedKeys.size;

  // ── Bulk apply handler ──
  const handleBulkApply = (config: BulkConfigValues) => {
    const newItems: SelectedCampaignItem[] = [];

    for (const key of checkedKeys) {
      if (alreadyAddedKeys.has(key)) continue;
      const row = allRowsCache.current.get(key);
      if (!row) continue;
      newItems.push({
        ...row,
        promotionType: config.promotionType,
        discountType: config.discountType,
        discountValueInput: config.discountValue,
        maxUsageInput: row.batchId ? "" : config.maxUsage,
      });
    }

    onSelectedItemsChange([...selectedItems, ...newItems]);
    setCheckedKeys(new Set());
    setBulkModalOpen(false);
    showToast(`Đã thêm ${newItems.length} sản phẩm vào chiến dịch`, "success");
  };

  return (
    <Stack spacing={2} sx={{ minHeight: 0, flex: 1 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        Chọn hàng / lô để thêm vào chiến dịch khuyến mãi
      </Typography>

      {/* Category tabs */}
      <Paper variant="outlined">
        <Tabs
          value={selectedCategoryTab}
          onChange={(_, v: CampaignCategoryTab) => {
            setSelectedCategoryTab(v);
            setStockPage(0);
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          {CATEGORY_TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {/* Filters */}
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr 1fr auto" },
        }}
      >
        <TextField
          label="SKU / Batch code"
          value={stockSearchInput}
          onChange={(e) => setStockSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setStockSearchValue(stockSearchInput.trim());
              setStockPage(0);
            }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  onClick={() => {
                    setStockSearchValue(stockSearchInput.trim());
                    setStockPage(0);
                  }}
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <FormControl fullWidth>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={stockStatusFilter}
            label="Trạng thái"
            onChange={(e) => {
              setStockStatusFilter(e.target.value as StockStatusFilter);
              setStockPage(0);
            }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="OutOfStock">Hết hàng</MenuItem>
            <MenuItem value="LowStock">Sắp hết</MenuItem>
            <MenuItem value="Normal">Bình thường</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Hạn dùng</InputLabel>
          <Select
            value={expiryDaysFilter}
            label="Hạn dùng"
            onChange={(e) => {
              setExpiryDaysFilter(e.target.value as ExpiryDaysFilter);
              setStockPage(0);
            }}
          >
            {EXPIRY_FILTER_OPTIONS.map((o) => (
              <MenuItem key={o.value || "all-expiry"} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<ClearIcon />}
          onClick={() => {
            setStockSearchInput("");
            setStockSearchValue("");
            setStockStatusFilter("");
            setExpiryDaysFilter("");
            setSelectedCategoryTab("all");
            setStockPage(0);
          }}
          sx={{ height: 56 }}
        >
          Xóa lọc
        </Button>
      </Box>

      {/* Floating bulk action bar */}
      {checkedCount > 0 && (
        <Paper
          elevation={4}
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "primary.50",
            border: 1,
            borderColor: "primary.200",
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            Đã chọn {checkedCount} sản phẩm
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => setBulkModalOpen(true)}
          >
            Cấu hình chung cho {checkedCount} sản phẩm đã chọn
          </Button>
        </Paper>
      )}

      {/* Stock table with checkboxes */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ minHeight: 0, flex: 1, overflowY: "auto" }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.50" }}>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someChecked && !allChecked}
                  checked={allChecked}
                  onChange={handleToggleAll}
                  disabled={availableKeys.length === 0}
                />
              </TableCell>
              <TableCell sx={{ width: 56, minWidth: 56 }}>Ảnh</TableCell>
              <TableCell sx={{ minWidth: 220 }}>Sản phẩm</TableCell>
              <TableCell sx={{ minWidth: 140 }}>SKU</TableCell>
              <TableCell align="right" sx={{ minWidth: 120 }}>
                Giá
              </TableCell>
              <TableCell align="right" sx={{ minWidth: 90 }}>
                Khả dụng
              </TableCell>
              <TableCell align="center" sx={{ minWidth: 110 }}>
                Trạng thái
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : stockError ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Alert severity="error">{stockError}</Alert>
                </TableCell>
              </TableRow>
            ) : stockList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Không có dữ liệu tồn kho phù hợp.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              stockList.map((stock) => {
                const variantId = stock.variantId || "";
                const variantKey = `${variantId}-all`;
                const batchState = variantId
                  ? batchByVariantId[variantId]
                  : undefined;
                const stockStatus = getStockStatusDisplay(stock);
                const isVariantAdded = alreadyAddedKeys.has(variantKey);

                return (
                  <Fragment key={stock.id || variantId}>
                    {/* Variant row */}
                    <TableRow hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={
                            checkedKeys.has(variantKey) || isVariantAdded
                          }
                          onChange={() => handleToggleRow(variantKey)}
                          disabled={isVariantAdded}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <Avatar
                          src={stock.variantImageUrl}
                          alt={stock.productName || "Product"}
                          variant="rounded"
                          sx={{ width: 40, height: 40 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          fontWeight={600}
                          sx={{ fontSize: "0.875rem", lineHeight: 1.3 }}
                        >
                          {stock.productName || "N/A"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block" }}
                        >
                          {stock.volumeMl ? `${stock.volumeMl}ml` : ""}
                          {stock.volumeMl && stock.concentrationName
                            ? " • "
                            : ""}
                          {stock.concentrationName || ""}
                        </Typography>
                        {isVariantAdded && (
                          <Chip
                            size="small"
                            label="Đã thêm"
                            color="success"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {stock.variantSku || "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color="error.main"
                          fontWeight={600}
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          {(() => {
                            const cached =
                              variantPricesCache[stock.variantId || ""];
                            if (!cached) return "−";
                            const price = cached.basePrice;
                            return price != null
                              ? `${price.toLocaleString("vi-VN")} ₫`
                              : "−";
                          })()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {stock.availableQuantity ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          color={stockStatus.color}
                          label={stockStatus.label}
                        />
                      </TableCell>
                    </TableRow>

                    {/* Batch sub-rows */}
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ bgcolor: "grey.50", py: 1.5 }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", px: 1, mb: 1 }}
                        >
                          Danh sách lô của SKU {stock.variantSku || "N/A"}
                        </Typography>
                        {batchState?.loading ? (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{ px: 1 }}
                          >
                            <CircularProgress size={18} />
                            <Typography variant="body2" color="text.secondary">
                              Đang tải danh sách lô...
                            </Typography>
                          </Stack>
                        ) : batchState?.error ? (
                          <Alert severity="error">{batchState.error}</Alert>
                        ) : !batchState || batchState.items.length === 0 ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ px: 1 }}
                          >
                            Không có lô nào cho variant này.
                          </Typography>
                        ) : (
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell padding="checkbox" />
                                  <TableCell>Batch code</TableCell>
                                  <TableCell>NSX - HSD</TableCell>
                                  <TableCell align="right">Còn lại</TableCell>
                                  <TableCell align="center">
                                    Trạng thái
                                  </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {batchState.items.map((batch) => {
                                  const batchKey = `${variantId}-${batch.id}`;
                                  const isBatchAdded =
                                    alreadyAddedKeys.has(batchKey);

                                  return (
                                    <TableRow
                                      key={
                                        batch.id ||
                                        `${variantId}-${batch.batchCode}`
                                      }
                                    >
                                      <TableCell padding="checkbox">
                                        <Checkbox
                                          checked={
                                            checkedKeys.has(batchKey) ||
                                            isBatchAdded
                                          }
                                          onChange={() =>
                                            handleToggleRow(batchKey)
                                          }
                                          disabled={isBatchAdded}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {batch.batchCode || "N/A"}
                                        {isBatchAdded && (
                                          <Chip
                                            size="small"
                                            label="Đã thêm"
                                            color="success"
                                            sx={{ ml: 1 }}
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          NSX:{" "}
                                          {formatDate(batch.manufactureDate)}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          HSD: {formatDate(batch.expiryDate)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell align="right">
                                        {batch.remainingQuantity ?? 0}
                                      </TableCell>
                                      <TableCell align="center">
                                        {batch.isExpired ? (
                                          <Chip
                                            size="small"
                                            color="error"
                                            label="Hết hạn"
                                          />
                                        ) : (batch.daysUntilExpiry ?? 9999) <=
                                          60 ? (
                                          <Chip
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            label={`Còn ${batch.daysUntilExpiry ?? 0} ngày`}
                                          />
                                        ) : (
                                          <Chip
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                            label={`Còn ${batch.daysUntilExpiry ?? 0} ngày`}
                                          />
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </TableCell>
                    </TableRow>
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
        onPageChange={(_, p) => setStockPage(p)}
        rowsPerPage={stockRowsPerPage}
        onRowsPerPageChange={(e) => {
          setStockRowsPerPage(Number(e.target.value));
          setStockPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Dòng mỗi trang:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} của ${count}`
        }
      />

      <BulkConfigModal
        open={bulkModalOpen}
        selectedCount={checkedCount}
        onClose={() => setBulkModalOpen(false)}
        onApply={handleBulkApply}
      />
    </Stack>
  );
};
